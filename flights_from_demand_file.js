/*
curfews.js
*/

phantom.libraryPath = '/home/delano/js';

phantom.injectJs( 'global.js'); 
phantom.injectJs( 'selectors.js'); 
phantom.injectJs('create_flights.js');

// only do login check if all params available
phantom.injectJs('login.js'); 

var jsonFile = "";
if (casper.cli.has('json'))
{
    jsonFile = casper.cli.get('json');
	console.log("Using json file ["+jsonFile+"]");
    phantom.injectJs(jsonFile);
}
else
{
    console.log("Must include --json=<json file containing flightData>");
    casper.exit(1);
}

/*
var flightData = [
{ 'from_icao_code': 'EINN', 'to_icao_code': 'EHAM', 'fleet_type_id': '22', 'count': 2 },
{ 'from_icao_code': 'EINN', 'to_icao_code': 'EGKK', 'fleet_type_id': '37', 'count': 1 },
]
*/
var results = [];

casper.then(function() {
	this.each(flightData, function (self, f)
	{
		//console.log(JSON.stringify(f, null, 4));

		if (f.count === undefined)
			f.count = 1;
		this.repeat(f.count, function() {
			//this.wait(1000, function() {
				this.createFlights(f.from_icao_code, f.to_icao_code, f.fleet_type_id, null, null, function(obj) { results.push(obj); } );
			//});
			//console.log("results=\n"+JSON.stringify(results, null, 4));
		});
	});

});

casper.then (function() 
{
	console.log(JSON.stringify(results, null, 4));

	postDataObj = {};

	postDataObj.game_id	= gameID;
	postDataObj.newFlightData = JSON.stringify(results);

	// create random 6-char instance name to add to the db
	postDataObj.instance = new Array(6).join().replace(/(.|$)/g, function(){return ((Math.random()*36)|0).toString(36)[Math.random()<0.5?"toString":"toUpperCase"]();});

	uri = 'http://localhost/aws/app/v1/games/' + gameID + '/flights';
	casper.thenOpen(uri,
		{
			method: 'post',
			data: postDataObj.newFlightData
		},
		
		function (response)
		{
			console.log(JSON.stringify("testcreate.js:70 "+response, null, 4));
		});
});
casper.run();
