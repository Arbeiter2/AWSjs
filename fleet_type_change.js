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
					  "--from-aircraft=<aircraft-reg>\n" + 
					  "[--fleet_type=<icao-code> ("+ keys.join("|") + ")] OR \n\t" +
					  "[--fleet_type_id=<fleet_type_id> (" + vals.join("|") + ")]");
	casper.exit(1);
}

	
if (casper.cli.has('h') || !casper.cli.has('from-aircraft'))
{
	usage();
	casper.exit(1);
}
var aircraftParam = casper.cli.get("from-aircraft").toUpperCase().trim();

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
var RESTflights = RESThost +  'games/' + gameID + '/flights';


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
		
		//formData["#FleetID"] = FleetID;
		
		if (this.exists('#noSlots1'))
			formData['#noSlots1'] = formData['#noSlots2'] = true;
		
		this.fillSelectors(EditRouteSelectors.form, formData, false);
		//f = this.getFormValues(EditRouteSelectors.form);
 //console.log(JSON.stringify(f, null, 4));


// console.log(JSON.stringify(formData, null, 4));
//console.log(JSON.stringify(this.getFormValues(EditRouteSelectors.form)));

		flightDataObj = this.getFlightData(); 
		//console.log(JSON.stringify(flightDataObj, null, 4));
		//console.log(JSON.stringify(this.getElementInfo('#loadingAnimation'), null, 4));

		
		this.thenClick('#confBtn', function() {
			this.waitForText('The route has been updated.', function() { 
				this.thenOpen(RESTflights, {
						method: 'post',
						data:   flightDataObj
					},
					
					function()
					{
						logMessage("OK",  '@' + flightDataObj.flight_number + '@,' + 'http://www.airwaysim.com/Routes/View/' + flightDataObj.flight_id + "\t" + 
								flightDataObj.base_airport_iata + "-" + flightDataObj.dest_airport_iata);
					});
				},
				
				function timeout() {
					logMessage('ERROR', this.fetchText(EditRouteSelectors.routeErrorMessages));
				},
				
				10000); 			
		});
	});

});
});

	

casper.run();
