phantom.injectJs( './global.js');
phantom.injectJs( './selectors.js'); 
phantom.injectJs( './login.js'); 
casper.viewportSize = {width: 1024, height: 768};

var host = 'http://www.airwaysim.com';

var postDataObj = {};
postDataObj.game_id	= gameID;

var aircraftData = {};

var links = [];
var pageNr = 0;

casper.thenOpen('http://www.airwaysim.com/game/Aircraft/My',

function processLinks()
{
	pageNr++;

//console.log('Processing page ' + pageNr);

	this.waitForSelector(ViewAircraftSelectors.functionSelect);

	var acIDs = this.getElementsInfo(ViewAircraftSelectors.boozer);
	var dataRows = [];
	
	for(var index=0; index < acIDs.length; index++) {
		dataRows[index] = acIDs[index].attributes.id.replace('Model', 'http://www.airwaysim.com/game/Aircraft/My/View/');
	};
	
	links.push.apply( links, dataRows );
	
	logMessage('DEBUG', "Got " + dataRows.length + " aircraft on page " + pageNr);

	// traverse all pages
	if (this.exists(ViewAircraftSelectors.pageSelector))
	{
		// find number of select options = number of pages
		var f = this.evaluate(function(sel) {
			return document.querySelector('#aircraftForm > div.Small.alRight > select').length;
		});
		
		// selected page number is highlighted in footer
		var pNr = this.getElementInfo(ViewAircraftSelectors.currentPage).text.trim();
		if (pNr < f)
		{
			this.thenClick(ViewAircraftSelectors.nextPage, function() {
				casper.waitForSelectorTextChange(ViewAircraftSelectors.currentPage, function() {
						casper.then(processLinks);
				});
			});
		}
	}
});


var nAircraftProcessed = 0;

casper.then(function () {
	logHTML("<table class='CSSTableGenerator'>\n<thead>\n<tr><td>Aircraft<br />Reg</td><td>Type</td><td>Base</td></tr>\n</thead>\n<tbody>\n");
});		

casper.then(function () {
	for (i=0; i < links.length; i++)
	{
		nAircraftProcessed++;
		casper.thenOpen(links[i], function() {

			casper.waitForSelector(ViewAircraftSelectors.fleetTypeDescription,

				function()
				{
					// aircraft in storage have no base details, so we bomb
					if (!this.exists(ViewAircraftSelectors.baseAirportLink))
					{
						logMessage("INFO", "Aircraft in storage; ignoring");
						return;
					}
					var aircraftDataObj = {};
//console.log(this.getCurrentUrl());
					var f = this.getCurrentUrl().match(/\/(\d+)/i);
					var aircraft_id	= f[1];
					
					// inexplicably, using the same css selector twice is not possible here; ended
					// up using the xpath instead
					xp = this.getElementInfo(x('//*[@id="aircraftData"]/table/tbody/tr[3]/td[2]/a'));
					aircraftDataObj.fleet_type_description = xp.text;
					aircraftDataObj.fleet_type_id = (xp.attributes.href.split('='))[1];

					aircraftDataObj.aircraft_id	= aircraft_id;
					aircraftDataObj.fleet_model_id = this.getHTML('div[id^=Model]').trim();
					aircraftDataObj.model_description = this.getHTML('div[id^=modelName]').trim();
					aircraftDataObj.MSN = this.getHTML('#aircraftData > table > tbody > tr:nth-child(6) > td.Bg1 > a').replace(/\D+/, '');
					aircraftDataObj.aircraft_reg = this.getElementInfo(ViewAircraftSelectors.registrationLink).text.trim();
					aircraftDataObj.base_iata_code = this.getElementInfo(ViewAircraftSelectors.baseAirportLink).text.trim();		
					aircraftDataObj.engines = this.getHTML(ViewAircraftSelectors.engines).trim();
					aircraftDataObj.variant = this.getHTML(ViewAircraftSelectors.variant).trim();
					aircraftDataObj.construction_date = this.getHTML(ViewAircraftSelectors.dateConstructed).trim();
//console.log(aircraftDataObj.aircraft_reg + "\n" + JSON.stringify(this.getElementInfo(ViewAircraftSelectors.seats), null, 4));	

					var seatsData = this.getElementInfo(ViewAircraftSelectors.seats).html;
					var m = (seatsData.match(/Y:\s+(\d+),\s+C:\s+\d+,\s+F:\s+\d+/gi))[0].split(/, /);
					aircraftDataObj.seats_Y = (m[0].split(/:\s+/))[1];
					aircraftDataObj.seats_C = (m[1].split(/:\s+/))[1];
					aircraftDataObj.seats_F = (m[2].split(/:\s+/))[1];
					
					// flight data
					var qa = this.getElementsInfo('#noBorderArea2 > div.borderOuter.flLeft > div.borderInner.smallDataBox > table > tbody > tr > td:nth-child(1) > a');
					aircraftDataObj.flight_id = qa.map(function (obj, idx, arr) {
						return (obj.attributes.href.split(/\//))[4];
					});
					
//console.log(JSON.stringify(aircraftDataObj));
//require('utils').dump(aircraftDataObj);
					//logMessage('OK', "@" + aircraftDataObj.aircraft_reg + "@," + this.getCurrentUrl() + "\t" + aircraftDataObj.model_description + "\t" + aircraftDataObj.base_airport_iata );
					
					// add the new data to the growing array
					aircraftData["ac_" + aircraftDataObj.aircraft_id] = aircraftDataObj;
//console.log(JSON.stringify(aircraftData["ac_" + aircraftDataObj.aircraft_id]));

				},

				function fail()
				{
					//logMessage('ERROR', "Crashed out waiting - check delivery details");
				},

				5000
			); // wait
		}); // thenOpen
	} // for
}); // then

casper.then (function() 
{
	postDataObj.aircraft_data = JSON.stringify(aircraftData);
	
	casper.open('http://localhost/aws/add_aircraft.php',
	{
		method: 'post',
		data: postDataObj
	});
});

casper.run();
