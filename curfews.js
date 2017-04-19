/*
curfews.js
*/

phantom.libraryPath = '/home/delano/js';

phantom.injectJs( './global.js'); 
phantom.injectJs( 'selectors.js'); 
//phantom.injectJs( 'c:/tmp/airports.json');
phantom.injectJs('login.js'); 
var allAirports = [];

function addCurfew(iata_code, curfer_start, curfer_finish)
{
	var curfewURL = 'http://localhost/aws/app/v1/airports/' + iata_code + '/curfew/' + curfer_start + '/' +curfer_finish;
	casper.thenOpen(curfewURL, 
		{
		method: 'post',
		},
		
	function() {
		console.log(iata_code + ": " + curfer_start + " - " + curfer_finish);
	});
}


var airportURL = 'http://localhost/aws/app/v1/games/' + gameID + '/airports';
var gameAirportURL = 'http://www.airwaysim.com/game/Routes/Airport/'; 

casper.thenOpen(airportURL, function() {
//	console.log(airportURL);
//	console.log(this.getPageContent());
	data = JSON.parse(this.getPageContent());
//	console.log(JSON.stringify(data, null, 4));
	allAirports = data['airports'][0]['destinations'];
//	console.log(JSON.stringify(allAirports, null, 4));
});


// only do login check if all params available

var results = [];

casper.then(function() {
casper.each(allAirports, function(casper, airport, index) {
	

  this.thenOpen(gameAirportURL + airport.icao_code + '/', function() {
	this.waitForText('Airport route map', function() {
		var curfew = this.fetchText('#noBorderArea > div > div.borderInner > table > thead > tr:nth-child(5) > td:nth-child(2)').trim();
		if (curfew !== "Open 24H")
		{
			var m = curfew.match(/Closed between (\d+)-(\d+) local time/);
			//console.log("INSERT IGNORE INTO airport_curfews VALUES ('"+airport.iata_code+"', '"+airport.icao_code+"', '"+("0" + m[1]).slice(-2)+":00', '"+("0" + m[2]).slice(-2)+":00');");
			addCurfew(airport.iata_code, ("0" + m[1]).slice(-2) + ":00", ("0" + m[2]).slice(-2) + ":00");
		}
		else
		{
			//console.log("INSERT IGNORE INTO airport_curfews VALUES ('"+airport.iata_code+"', '"+airport.icao_code+"', NULL, NULL);");
		}
	},

	function timeout()
	{
		this.capture('c:\temp\xrerror.png');

	},
	
	10000);
	});

});
});

casper.run();