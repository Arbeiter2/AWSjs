phantom.libraryPath = '/home/delano/js';

phantom.injectJs( 'global.js'); 
phantom.injectJs( 'selectors.js');
phantom.injectJs( './login.js'); 
phantom.injectJs( './getflightdata.js'); 
phantom.injectJs( './schedules.js'); 

var types = {
    'F50' : { 'fleet_type_id' : 37, 'turnaround' : 50 },
    'B732' :  { 'fleet_type_id' : 22, 'turnaround' : 70 },
    'B733' :  { 'fleet_type_id' : 23, 'turnaround' : 70 },
    'B736' :   { 'fleet_type_id' : 24, 'turnaround' : 70 },
    'A340' :   { 'fleet_type_id' : 8, 'turnaround' : 150 },
    'B757' :  { 'fleet_type_id' : 28, 'turnaround' : 115 },
    'B767' :   { 'fleet_type_id' : 29, 'turnaround' : 135 },
    'B777' : { 'fleet_type_id' : 30, 'turnaround' : 150 },
    'DH8D' :  { 'fleet_type_id' : 106, 'turnaround' : 40 },
    'A320' : { 'fleet_type_id' : 7, 'turnaround' : 70 },
    'MD80' : { 'fleet_type_id' : 63, 'turnaround' : 70 }
};

function getTurnaround(id)
{
	for (var a in types)
	{
		if (id == types[a].fleet_type_id)
			return types[a].turnaround;
	}
	return 0;
}
	
function usage()
{
	keys = [];
	vals = [];
	for (var a in types)
	{
		keys.push(a);
		vals.push(types[a].fleet_type_id);
	}
	console.log(argv[0] + requiredArgs.join("\n") + "\n" +
					  "--h\tthis message" + "\n" +
					  "--commit\tapply changes" + "\n" +
					  "--from-aircraft=<aircraft-reg> OR \n\t" + 
					  "[--keyword=<keyword>]\n" + 
					  "[--fleet_type=<icao-code> ("+ keys.join("|") + ")] OR \n\t" +
					  "[--fleet_type_id=<fleet_type_id> (" + vals.join("|") + ")]");
	casper.exit(1);
}

	
if (casper.cli.has('h') || !(casper.cli.has('from-aircraft') ^ casper.cli.has('keyword')))
{
	usage();
	casper.exit(1);
}

var commit = casper.cli.has('commit');
//var aircraftParam = casper.cli.get("from-aircraft").toUpperCase().trim();

var fleet_type_id = 0;
var turnaround = 0;

if (casper.cli.has('fleet_type'))
{
	var fleet = types[casper.cli.get("fleet_type").toUpperCase().trim()];
	if (fleet === undefined)
	{
		logMessage("ERROR", "Fleet type [" + fleet + "] not found");
		usage();
	}
	fleet_type_id = fleet.fleet_type_id;
	turnaround = fleet.turnaround;
	
}
else if (casper.cli.has('fleet_type_id'))
{
	fleet_type_id = parseInt(casper.cli.get("fleet_type_id").toUpperCase().trim());
	turnaround = getTurnaround(fleet_type_id);
	if (turnaround === 0)
	{
		logMessage("ERROR", "Fleet type ID [" + fleet_type_id + "] not found");
		usage();
	}	
}
else
{
	usage();
}


//casper.viewportSize = {width: 1024, height: 768};
var RESThost = 'http://localhost/aws/app/v1/';
var RESTflights = RESThost +  'games/' + gameID + '/flights/';


var host = 'http://www.airwaysim.com';
var flightNumber;
var postDataObj = {};
postDataObj.game_id	= gameID;


// we create a JSON string containing all the flight details to be added
var flightData = {};

// two-letter airline code
var airlineCode = null;

var aircraft = [];
var aircraftFlightMap = {};
var pageNr = 0;
var links = [];
var a_reg = [];
var id = '00000';

function getFleetFlights(keyword)
{
	var searchURL = 'http://www.airwaysim.com/game/Routes/Manage/?Keyword=' + keyword;
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
}

function getAircraftFlights(aircraftParam, callback)
{
	links = [];
	casper.then(
		function()
		{
			this.getAircraftID(aircraftParam, function(ACData)
			{
				if (ACData.aircraft_id == -1)
				{
					logMessage("ERROR", "Unable to find aircraft ["+aircraftParam+"]");
					this.exit(10);
				}
				id = ACData.aircraft_id;
			});
		}
	);


	casper.then(
		function()
		{
			console.log(this.getCurrentUrl());
			this.getRouteData(id, function(routes)
			{
				if (routes.length === 0)
				{
					logMessage("ERROR", "No routes on aircraft ["+aircraftParam+"]");
					this.exit(12);				
				}
				links = routes;
			});
		}
	);

	casper.then(function() { callback(links); });
}


function getAircraftFlights(aircraftParam, callback)
{
	links = [];
	casper.then(
		function()
		{
			this.getAircraftID(aircraftParam, function(ACData)
			{
				if (ACData.aircraft_id == -1)
				{
					logMessage("ERROR", "Unable to find aircraft ["+aircraftParam+"]");
					this.exit(10);
				}
				id = ACData.aircraft_id;
			});
		}
	);
}

function changeFlights(links, commit)
{
	allFlightData = [];
	casper.then( function() {
	casper.each(links, function(casper, flight_link, index) {
		var flightDataObj;
		this.thenOpen(routeEditURL + flight_link.flight_id, function() { 

			this.waitForSelector('#confBtn');

		});
		this.then(function() {
			this.evaluate(function(FleetID, Turn1) {
				$('#FleetID').val(FleetID).change();
				$('#Turn1').val(Turn1).change();
			}, 'a' + fleet_type_id, turnaround);
			this.capture("c:/tmp/trash-.png");

			//console.log(JSON.stringify(this.getElementInfo('#loadingAnimation'), null, 4));
			this.wait(1500);
			//this.waitForSelectorTextChange(x('//*[@id="routeEditorArea"]/div[1]/div[2]/table/thead/tr[7]/td[2]/table/tbody/tr[3]/td[2]'));
		});
		
		
		this.then(function() 
		{ 
			var formData = {};

			
			//this.waitWhileVisible('#loadingImage');
			this.capture("c:/tmp/trash.png");
					
			if (this.exists('#noSlots1'))
				formData['#noSlots1'] = formData['#noSlots2'] = true;
			
			this.fillSelectors(EditRouteSelectors.form, formData, false);
			flightDataObj = this.getFlightData(); 
			allFlightData.push(flightDataObj);
			
			if (commit)
			{
				this.thenClick('#confBtn', function() {
					this.waitForText('The route has been updated.', function() { 
						console.log("Change applied to "+flightDataObj['flight_number']);
					});
				});
			}


			logMessage("OK",  '@' + flightDataObj.flight_number + '@,' + 'http://www.airwaysim.com/Routes/View/' + flightDataObj.flight_id + "\t" + 
				flightDataObj.base_airport_iata + "-" + flightDataObj.dest_airport_iata);
		});
	});

	});



	casper.thenOpen(RESTflights,
		{
			method: 'post',
			headers: {
				'Content-Type': 'application/json',
			},
			data: allFlightData
		},
		
		function(response) {
			//console.log(JSON.stringify(response));
			//console.log(JSON.stringify(allFlightData));
			
	});
}	

	

casper.run();
