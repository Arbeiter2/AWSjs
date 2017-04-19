phantom.libraryPath = '/home/delano/js';

phantom.injectJs( 'global.js'); 
phantom.injectJs( 'selectors.js');
phantom.injectJs( './login.js'); 

var submitBtn = 'input[type="submit"]';


/**
 **
 **
 **/
casper.getUnassignedAircraft = function(callback)
{
	if (typeof callback !== "function")
	{
		return;
	}
	
	// create initial form search
	var UAMSearch = {
		'#filterUnScheduled' : true
	};
	
	

	unassigned_link = '#noRoutes > div.borderInner.smallDataBox > table > tbody > tr > td.Bg1.alCenter.RegNum > a';
	var links = [];

	casper.thenOpen('http://www.airwaysim.com/game/Aircraft', function()
		{
			this.waitUntilVisible('#noRoutes', 
				function ()
				{
					links = this.getElementsInfo(unassigned_link);
					//console.log(JSON.stringify(links, null, 4));
				},
				
				function () 
				{ 
					//console.log("Nothing found"); 
				},
			
				3000
			);
		}
	);
	
	aircraftData = [];
	gameURL = 'http://www.airwaysim.com/';
		
	casper.then(function () {
		this.each(links, function(self, acLink)
		{
			//console.log(gameURL + acLink.attributes.href);
			this.thenOpen(gameURL + acLink.attributes.href, function() {

				this.waitUntilVisible(ViewAircraftSelectors.fleetTypeDescription,

					function()
					{
						// aircraft in storage have no base details, so we bomb
						if (!this.exists(ViewAircraftSelectors.baseAirportLink))
						{
							//logMessage("INFO", "Aircraft in storage; ignoring");
							return;
						}
						var aircraftDataObj = {};
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
						aircraftDataObj.registration = this.getElementInfo(ViewAircraftSelectors.registrationLink).text.trim();
						aircraftDataObj.base_airport_iata = this.getElementInfo(ViewAircraftSelectors.baseAirportLink).text.trim();	
						//console.log(JSON.stringify(this.getElementInfo(x('//*[contains(text(),"Nominal range")]/following-sibling::td')), null, 4));
						aircraftDataObj.range = this.getElementInfo(x('//*[contains(text(),"Nominal range")]/following-sibling::td')).text.replace(/\D+/g, '');

						var seatsData = this.getElementInfo(ViewAircraftSelectors.seats).html;
						var m = (seatsData.match(/Y:\s+(\d+),\s+C:\s+\d+,\s+F:\s+\d+/gi))[0].split(/, /);
						aircraftDataObj.seats_Y = (m[0].split(/:\s+/))[1];
						aircraftDataObj.seats_C = (m[1].split(/:\s+/))[1];
						aircraftDataObj.seats_F = (m[2].split(/:\s+/))[1];
						
						
						// add the new data to the growing array
						aircraftData.push(aircraftDataObj);
						
						//console.log(JSON.stringify(aircraftDataObj, null, 4));
					},

					function fail()
					{
						//this.capture("c:/tmp/aircraft.png");
						//logMessage('ERROR', "Crashed out waiting - check delivery details");
						//console.log(this.getElementInfo(ViewAircraftSelectors.fleetTypeDescription), null, 4);
					},

					5000
				); // wait
			}); // thenOpen
		}); // each
	}); // then
	
	casper.then(
		function()
		{
			callback(aircraftData);
		}
	);
};


casper.then(function() 
	{
		this.getUnassignedAircraft(function(results)
		{
			console.log(JSON.stringify(results, null, 4));
		});
	}
);


casper.run();
