/*
gets everything incl. the flight_id value
*/
phantom.injectJs('getflightdata.js');
/*
// http://docs.casperjs.org/en/latest/events-filters.html#remote-message
casper.on("remote.message", function(msg) {
    this.echo("Console: " + msg);
});

// http://docs.casperjs.org/en/latest/events-filters.html#page-error
casper.on("page.error", function(msg, trace) {
    this.echo("Error: " + msg);
    // maybe make it a little fancier with the code from the PhantomJS equivalent
});

// http://docs.casperjs.org/en/latest/events-filters.html#resource-error
casper.on("resource.error", function(resourceError) {
    this.echo("ResourceError: " + JSON.stringify(resourceError, undefined, 4));
});

// http://docs.casperjs.org/en/latest/events-filters.html#page-initialized
casper.on("page.initialized", function(page) {
    // CasperJS doesn't provide `onResourceTimeout`, so it must be set through 
    // the PhantomJS means. This is only possible when the page is initialized
    page.onResourceTimeout = function(request) {
        console.log('Response Timeout (#' + request.id + '): ' + JSON.stringify(request));
    };
});
*/

casper.createFlights = function(from_ICAO, to_ICAO, fleet_type_id, days, time, callback)
{
	var OpenRouteURL = 'http://www.airwaysim.com/game/Routes/Open/%1/%2/';
	
	//console.log("Starting....");
	
	if (from_ICAO.match(/^([A-Z]{4})$/i) === null || to_ICAO.match(/^([A-Z]{4})$/i) === null || parseInt(fleet_type_id, 10) <= 0)
	{
		logMessage("ERROR", "Bad args for createFlights: "+[from_ICAO, to_ICAO, fleet_type_id, days, time].join(", "));
		return null;
	}
	from_ICAO = from_ICAO.toUpperCase();
	to_ICAO = to_ICAO.toUpperCase();
	newUrl = OpenRouteURL.replace('%1', from_ICAO).replace('%2', to_ICAO);
	
	if (days === null || days === undefined)
		days = [1];
	
	if (time === null || time === undefined)
		time = "12:00";

	this.thenOpen(newUrl, function() {
		//this.waitForText('Click confirm when all airports are selected.', 
		this.waitUntilVisible(CreateRouteSelectors.confirmBtn,
		function found()
		{		
		//console.log("clicking confirm");
		this.capture('c:/tmp/predodgy.png');


		},
		
		function timeout()
		{
			logMessage("ERROR", "Timeout waiting for " + this.getCurrentUrl());
			return null;
		},
		
		10000);
	});
	

	this.thenClick(CreateRouteSelectors.confirmBtn, function() {
		this.waitUntilVisible('#confBtn', 
		
			function found()
			{
//console.log(JSON.stringify(this.getElementsInfo('#FleetID'), null, 4));
				
			},
			
			function timeout()
			{
				logMessage("ERROR", "Timeout waiting for confirm button: " + this.getCurrentUrl());
				this.capture('c:/tmp/dodgy.png');
				return null;		
			},
			
			10000
		);
	});
		
		

	var formData = {};
	this.then(function() {
		
		//var formData = this.getFormValues(EditRouteSelectors.form);
		//formData['#FleetID'] = 'a' + fleet_type_id.toString();
		//console.log('FleetID = ' + ('a' + fleet_type_id));
				
		// days
		for (i=0; i < days.length; i++)
			this.click('#Days'+(days[i]-1));
		
		// time
		p = time.match(/^(\d+):(\d+)$/);

		formData['#Dep1H'] = p[1];
		formData['#Dep1M'] = p[2];

        this.evaluate(function(hh, mm, f) {
            $('#Dep1H').val(hh);
            $('#Dep1M').val(mm);
            $('#FleetID').val("a" + f);
            document.getElementById('FleetID').value = "a" + f;
            $('#FleetID').trigger("change");

            //loadTimes('open', '0');

        }, p[1], p[2], fleet_type_id);

		
		this.waitUntilVisible('#noSlots1', 
		
			function found() 
			{ 
				//this.fillSelectors(EditRouteSelectors.form, formData, false);
				
				this.click('#noSlots1');
				this.click('#noSlots2');

				this.fillSelectors(EditRouteSelectors.form, formData, false);
			},
			
			function timeout() {
				console.log("Still no noSlots for flights to "+to_ICAO+" (time "+time+")");
				this.capture("/tmp/badflight.jpg");
				casper.exit(1);
			},
		
			20000
		);
	});


	
	// submit
	var flightDataObj = {};
	this.then(function() {
		this.waitWhileVisible("#loadingAnimation", function() {}, function() {}, 3000);
		flightDataObj = this.getFlightData();
//console.log(JSON.stringify(flightDataObj, null, 4));

	});
	
	this.thenClick('#confBtn', function() {
		this.waitForSelector(EditRouteSelectors.routeSuccessMessage, 
		
			function()
			{
/*logMessage("OK",  '@' + flightDataObj.flight_number + "\t" + flightDataObj.base_airport_iata + "-" + flightDataObj.dest_airport_iata);
				this.wait(750);

//	console.log(JSON.stringify(flightDataObj, null, 4));
*/
				// grab the flight_id from the Edit link
				p = this.getElementInfo(x('//*[@title="Edit route"]')).attributes.href.match(/\/(\d+)\/?/i);
				flightDataObj.flight_id = p[1];
				logMessage("OK",  '@' + flightDataObj.flight_number + '@,' + 'http://www.airwaysim.com/Routes/View/' + flightDataObj.flight_id + "\t" + 
							flightDataObj.base_airport_iata + "-" + flightDataObj.dest_airport_iata);
				if (callback !== undefined && callback !== null && typeof callback === "function")
				{
					callback(flightDataObj);
				}			
			},
			
			function timeout()
			{
				logMessage('ERROR', "Unable to create route: " + this.fetchText('#routeErrorMsgText'));
				return false;
			},
		
		10000);
	});

	return flightDataObj;
};
