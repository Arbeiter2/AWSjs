phantom.libraryPath = '/home/delano/js';

phantom.injectJs( 'global.js'); 
phantom.injectJs( 'selectors.js');
phantom.injectJs( './login.js'); 

function usage()
{
console.log(argv[0] + requiredArgs.join("\n") + "\n" +
					  "--h\tthis message" + "\n" +
					  "--keyword=<keyword>\tupdate flights matching string\n" +
					  "--all\tupdate all flights");
}


function flightArrayToHash(arr) 
{
  var rv = {};
  for (var i = 0; i < arr.length; ++i)
    rv["fl_" + arr[i]] = arr[i];
  return rv;
}

function getAircraftURLData(html)
{
	var retVal = [ {}, {} ];
	
	retVal[0].href = retVal[0].text = retVal[1].href = retVal[1].text  = "";
	
	// extract aircraft info
	var re = new RegExp('href=["]([^"]+)["].+>([^<]+)<\/a', 'igm');

	var m = re.exec(html);
	//logMessage('DEBUG', "Round 1 [" + m.join("]\n[") + "]");
	retVal[0].href = m[1];
	retVal[0].text = m[2];

	// run again
	m = re.exec(html);
	if (m !== null)
	{
		//logMessage('DEBUG', "Round 2 [" + m.join("]\n[") + "]");
		retVal[1].href = m[1];
		retVal[1].text = m[2];
	}
	
	return retVal;
}
var DBFlightIDs = [];
var Deletions = {};

if (casper.cli.has('h'))
{
	usage();
	casper.exit(1);
}

var keywordList = [""];
if (casper.cli.has('keyword'))
{
	var key = casper.cli.get('keyword').toUpperCase();
	if (key.length >= 3)
	{
		keywordList = key.split(/,/);
		logMessage('INFO', "Using keywords [" + keywordList + ']');
	}
}

var noSlots = false;
if (casper.cli.has('no-slots'))
{
	noSlots = true;
	logMessage('INFO', "Only flights with no slots");	
}

casper.then(function() {
if (casper.cli.has('all'))// || keyword !== "")
{
	logMessage('INFO', "Updating all flights");
}
else
{
	// find the last flight_id added
	casper.thenOpen('http://localhost/aws/app/v1/games/' + gameID + '/flights/all_ids' , function() {
		DBFlightIDs = JSON.parse(this.getPageContent());
		Deletions = flightArrayToHash(DBFlightIDs);
	});
}
});

phantom.injectJs( './getflightdata.js'); 

//casper.viewportSize = {width: 1024, height: 768};

var host = 'http://www.airwaysim.com';
var flightNumber;
var postDataObj = {};
postDataObj.game_id	= gameID;

// create random 6-char instance name to add to the db
postDataObj.instance = new Array(6).join().replace(/(.|$)/g, function(){return ((Math.random()*36)|0).toString(36)[Math.random()<0.5?"toString":"toUpperCase"]();});
logMessage('DEBUG', "instance = " + postDataObj.instance);

// we create a JSON string containing all the flight details to be added
var flightData = [];
var currentFlightIDs = [];

// two-letter airline code
var airlineCode = null;

var links = [];
var aircraft = [];
var aircraftFlightMap = {};
var pageNr = 0;
var totalPages;
var dead = false;
var pageLimit = 20;

casper.each(keywordList, function(self, keyword) {
var searchURL = 'http://www.airwaysim.com/game/Routes/Manage/?Keyword=' + keyword;
if (noSlots)
	searchURL += "&filterNoSlots=1"
casper.thenOpen(searchURL,

function processLinks()
{
	pageNr++;
	
	this.waitForSelector(ManageRouteSelectors.functionSelect, function() {}, function() {}, 3000);
	
	casper.then(function() {
		//console.log((pageNr)+" % "+pageLimit+" === "+(pageNr) % pageLimit);

		if (pageNr == 1)
		{
			//console.log(this.getCurrentUrl());
			
			// find number of select options = number of pages
			totalPages = this.evaluate(function(sel) {
				return document.querySelector('#routeForm > div.Small.alRight > select').length;
			});
			//console.log("totalPages = "+totalPages);
		}
		else if (pageNr % pageLimit === 0)
		{
			// start from scratch, by going to a new page and reloading
			this.thenOpen('http://www.airwaysim.com/game/Routes/Schedules/');
			this.thenOpen(searchURL);
			this.waitForSelector(ManageRouteSelectors.functionSelect, function() {}, function() { console.log("Uh-oh, no functionselect"); casper.exit(1); }, 3000);
			
			
			this.then(function() {

				this.evaluate(function(newVal) {
					$('#routeForm > div.Small.alRight > select').val(newVal).trigger('change');
				}, pageNr);
				
				casper.waitFor(
				
					function check() { return (this.getHTML(ManageRouteSelectors.currentPage).trim() == pageNr); },
					
					function done() { },	

					function undone() { 
						console.log("Fail! Never got to new page"); 
						console.log("currentPage = "+this.getHTML(ManageRouteSelectors.currentPage));
						logMessage("ERROR", "Unable to get to page "+pageNr);
						casper.exit(); 
					},

				10000);
			});

		}
	});
	
	
	casper.then(function() {
	//console.log("Page = "+this.getElementInfo(ManageRouteSelectors.currentPage).text.trim());

	// grab the links
	var pageLinks = this.getElementsInfo(ManageRouteSelectors.viewRouteLinks);
	links.push.apply( links, pageLinks );

	var aircraftLinks = this.getElementsInfo(ManageRouteSelectors.assignedAircraftCell);
	aircraft.push.apply( aircraft, aircraftLinks );
	
	logMessage('DEBUG', "Got " + pageLinks.length + " routes on page " + pageNr+"/"+totalPages);

	// traverse remaining pages
	if (this.exists(ManageRouteSelectors.pageSelector))
	{
		var checkCount = 0;
		// selected page number is highlighted in footer
		var pNr = parseInt(this.getElementInfo(ManageRouteSelectors.currentPage).text.trim(), 10);
		//console.log("on page "+pNr);
		
		if (pNr < totalPages)
		{
			
			this.thenClick(ManageRouteSelectors.nextPage, function() {
				//casper.waitForSelectorTextChange(ManageRouteSelectors.currentPage, //function() {
				casper.waitFor(

				function check() {
					checkCount++;
					return (this.getHTML(ManageRouteSelectors.currentPage).trim() == pNr + 1);
				},
				
				function found() {
					//console.log("checkCount = "+checkCount);

					casper.then(processLinks);
				},
				
				function timeout() {
					//console.log("checkCount = "+checkCount);

					logMessage('DEBUG', "Dead at "+pNr);
					logMessage('DEBUG', "span says: ["+this.getElementInfo(ManageRouteSelectors.currentPage).text.trim()+"]");
					logMessage('DEBUG', JSON.stringify(this.getElementInfo(ManageRouteSelectors.currentPage)));
					
					dead = true;
				}, 
				15000);
			});
		}
	}
if (dead) return;
});
});

casper.then(function() {
casper.clear();
if (dead)
{
	logMessage("ERROR", "Terminating");
	casper.exit(2);
}
});

casper.then(function() {

	logMessage('DEBUG', "Got " + links.length + " routes on " + pageNr + " pages");
	if (airlineCode === null)
	{
		var m = links[0].html.match(/^(..)/);
		airlineCode = m[1];
	}

	casper.each (aircraft, function(casper, acInfo, index)
	{	
		var flight_id = links[index].attributes.href.replace(/.+\/View\//, '').replace(/\D+/, '');
		
		var acData = getAircraftURLData(acInfo.html);
		aircraftFlightMap[flight_id] = { 'aircraft_type' : acData[0].text,	'aircraft_reg' : acData[1].text };
	});
});

});

var nFlightsProcessed= 0;

casper.then(function () {
	logHTML("<table class='CSSTableGenerator'>\n<thead>\n<tr><td>Status</td><td>Flt Num</td><td>Base-Dest</td><td>Days</td></tr>\n</thead>\n<tbody>\n");
});		

casper.then(function () {
	for (i=0; i < links.length; i++)
	{
		var editUrl = host + (links[i].attributes.href.replace(/View/, 'Edit'));
		var f = links[i].attributes.href.match(/\/(\d+)\//i);
		var flight_id	= parseInt(f[1]);
	
		// remove the flight_id from the list of deletions
		delete Deletions['fl_' + flight_id];

		// add if not in the DB
		if (DBFlightIDs.length == 0 || DBFlightIDs.indexOf( flight_id ) == -1)
		{
			nFlightsProcessed++;
			casper.thenOpen(editUrl, function() {

				casper.waitForSelector(EditRouteSelectors.confirm,

					function()
					{
						var flightDataObj = this.getFlightData(); //{};
						//console.log(JSON.stringify(flightData, null, 4));
						
						logMessage('OK', "@" + flightDataObj.flight_number + "@,http://www.airwaysim.com/game/Routes/View/" + flightDataObj.flight_id + 
						"/\t" + flightDataObj.base_airport_iata + "-" + flightDataObj.dest_airport_iata + 
						"\t" + flightDataObj.days);

						// add the new data to the growing array
						flightData.push(flightDataObj);
						//console.log(JSON.stringify(flightData["fl_" + flightDataObj.flight_id]));

					},

					function fail()
					{
						logMessage('DEBUG', "Crashed out waiting");
					},

					15000
				); // wait
			}); // thenOpen
		} // if max_flight_id
		else
		{
			// note the flight ID
			currentFlightIDs.push(flight_id);
		}
	} // for
}); // then


casper.then (function() 
{
	postDataObj.newFlightData = JSON.stringify(flightData);
	postDataObj.deletions = JSON.stringify(Object.keys(Deletions).map(function (str)
	{
		return str.replace('fl_', '');
	})
	);


	/*
	casper.open('http://localhost/aws/add_routes.php',
	{
		method: 'post',
		data: postDataObj
	});*/
	
	uri = 'http://localhost/aws/app/v1/games/' + gameID + '/flights';
	//console.log(newFlightData);
	casper.thenOpen(uri,
		{
			method: 'post',
			data: postDataObj.newFlightData
		},
		
		function (response)
		{
			//console.log(JSON.stringify(response, null, 4));

			//require('utils').dump(this.getPageContent());
		});
	
	
});
		
casper.then(function () {
	if (!nFlightsProcessed)
		logHTML("<tr><td colspan='4'>No new flights processed</td></tr>");
		
	logHTML("\n</tbody>\n</table>\n");
	
	logMessage('INFO', "Processed " + nFlightsProcessed + " new flights");
});	

casper.run();
