/*
get_fleet.js
*/

phantom.libraryPath = '/home/delano/js';

phantom.injectJs( './global.js'); 
phantom.injectJs( 'selectors.js'); 

function usage()
{
console.log(argv[0] + requiredArgs.join("\n") + "\n" +
					  "--h\tthis message" + "\n" +
					  "--airline=<airline-id>[,<airline-id>,...]\tairline ID");
}

if (!casper.cli.has('airline'))
{
	usage();
	casper.exit(1);
}
var airlines = casper.cli.get("airline").toString().split(",");

// only do login check if all params available
phantom.injectJs('login.js'); 

var url = "http://www.airwaysim.com/game/Info/Airline/View/%airline%/" + gameID + "/#AirlineFleet";

var links = [];


casper.each(airlines, function(casper, id, idx)
{
casper.thenOpen(url.replace(/%airline%/, id), function() {

	var airlineName = this.fetchText('#tabs-AirlineInfo > div:nth-child(1) > div.borderInner.smallDataBox2 > table > tbody > tr:nth-child(1) > td.Bg1.Big').trim();

	// fleet model type name e.g. Airbus A330-200
	var ftl = this.getElementsInfo('a[id^="expandBtn"] + a[href*="filterFleet"]');
	//console.log(JSON.stringify(ftl, null, 4));

	// fleet type name e.g. Airbus A330/A340
	var ft = this.getElementsInfo('#Data-AirlineFleet > table > thead > tr > td.Title3Nr.left > span[class="AirlineStatTitle"]');
	//console.log(JSON.stringify(ft, null, 4));
	
	var fleet_lookup = {};
	var curFleetType = "";
	var curFleetIndex = -1;
	
	// create a lookup from the two arrays
	for (i=0; i < ftl.length; i++)
	{
		var ftype = ftl[i].attributes.href.split('=')[1];
		if (ftype != curFleetType)
		{
			curFleetType = ftype;
			++curFleetIndex;
		}
		fleet_lookup[ftl[i].text] = ft[curFleetIndex].text.replace(/ fleet/, '');
	}
	//console.log(JSON.stringify(fleet_lookup, null, 4));
	
	

	
	// for each fleet_model found there is one expandedFleetList entry
	var fleet_models = this.getElementsInfo('#Data-AirlineFleet > table > thead > tr > td:nth-child(1) > a:nth-child(2)');
	var model_lookup = [];
	
	casper.each(fleet_models, function(casper, fleet_model_link, idx) {
		model_lookup[idx] = fleet_model_link.html;
	});
	
	links = this.getElementsInfo("[id^='expandedFleetList']");
	var results = {};

	casper.each(links, function(casper, elem, index) {
		
		var fleet_locations = this.getElementsInfo('#' + elem.attributes.id + " > table > tbody > tr > td:nth-last-child(5) > a");
		
		casper.each(fleet_locations, function(casper, iata_link, idx) {
			var base = (iata_link.html.split(' / '))[1];
			if (results[base] === undefined)
			{
				results[base] = {};
			}
			
			if (results[base][fleet_lookup[model_lookup[index]]] === undefined)
			{
				results[base][fleet_lookup[model_lookup[index]]] = {};
			}
			
			if (results[base][fleet_lookup[model_lookup[index]]][model_lookup[index]] === undefined)
			{
				results[base][fleet_lookup[model_lookup[index]]][model_lookup[index]] = 0;
			}
			results[base][fleet_lookup[model_lookup[index]]][model_lookup[index]] = results[base][fleet_lookup[model_lookup[index]]][model_lookup[index]] + 1;
		});
	});

	console.log("\n" + airlineName + " (" + id + ")");
	console.log(JSON.stringify(results, null, 4));
});
});

casper.run();