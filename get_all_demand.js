/*
get_fleet.js
*/

phantom.libraryPath = '/home/delano/js';

phantom.injectJs( './global.js'); 
phantom.injectJs( 'selectors.js'); 

var options = ['game_id', 'base', 'region', 'min-range', 'min-demand',
			   'max-range', 'threshold', 'level', 'cargo', 'filter'];
var goodArgs = true;
function usage()
{
console.log(argv[0] + requiredArgs.join("\n") + "\n" +
					  "--h\tthis message" + "\n" +
					  "--base=<airport ICAO code>\n" +
					  "--region=<region code> (WO|NA|EU|AF|AS|SA|OC)\n" +
					  "--cargo (cargo only)\n",
					  "[--min-range=<minimum range>]\n" +
					  "[--max-range=<maximum range>]\n" +
					  "[--min-demand=<minimum demand>]\n" +
					  "[--threshold=<min demand>]\n" +
					  "[--filter (ignore routes currently flown)]\n" +
					  "--level=<airport level>[+] (0=All|1=Insignificant|2=Small|3=Middle-size|4=Significant|5=Large");
}

var links = [];
var i = 0;

for (var opt in casper.cli.options)
{
	if (opt === 'casper-path' || opt == 'cli' || opt == 'silent' || opt == 'html')
		continue;
	if (options.indexOf(opt) == -1)
	{
		goodArgs = false;
		logMessage("ERROR", "Invalid option [" + opt + "]");
		break;
	}
}

if (!casper.cli.has("region") || !casper.cli.has("level") || !casper.cli.has("base"))
{
	goodArgs = false;
}

// base
if (goodArgs)
{
	var base_ICAO = casper.cli.get("base").toUpperCase();
	if (!/^[A-Z]{4}$/.test(base_ICAO))
	{
		goodArgs = false;
	}
}

// region
if (goodArgs)
{
	var region = casper.cli.get("region").toUpperCase();
	if (region.match(/^(WO|NA|EU|AF|AS|SA|OC)$/) === null)
	{
		goodArgs = false;
	}
}

// level
if (goodArgs)
{
	var levelStr = casper.cli.get("level").toString();
	var levelOp = "=";
	if (levelStr.match(/^([0-9]|10)\+?$/) === null)
	{
		goodArgs = false;
	}
	else
	{
		if (levelStr[levelStr.length-1] == '+')
		{
			levelOp = ">=";
			levelStr = levelStr.slice(0, levelStr.length-1);
		}
		levels = levelOp + ' ' + levelStr;
	}
}

// threshold
if (goodArgs)
{
	var threshold = 125;
	if (casper.cli.has("threshold"))
	{
		threshold = parseInt(casper.cli.get("threshold"));
		if (threshold < 0)
		{
			goodArgs = false;
		}
	}
}

// min-range
if (goodArgs)
{
	var min_range = "0";
	if (casper.cli.has("min-range"))
	{
		min_range = parseInt(casper.cli.get("min-range"));
		if (min_range < 0)
		{
			goodArgs = false;
		}
	}
}


// max-range
if (goodArgs)
{
	var max_range = "0";
	if (casper.cli.has("max-range"))
	{
		max_range = parseInt(casper.cli.get("max-range"));
		if (max_range < 0)
		{
			goodArgs = false;
		}
	}
}

// min_demand
if (goodArgs)
{
	var min_demand = "0";
	if (casper.cli.has("min-demand"))
	{
		min_demand = parseInt(casper.cli.get("min-demand"));
		if (min_demand < 0)
		{
			goodArgs = false;
		}
	}
}

// filter
var filter = false;

if (goodArgs)
{
	if (casper.cli.has("filter"))
	{
		filter = true;
	}
	
	// either min_demand or threshold must be set
	if (min_demand === 0 && threshold === 0)
		goodArgs = false;
}

var cargo = false;

if (goodArgs)
{
	if (casper.cli.has("cargo"))
	{
		cargo = true;
	}
}



if (goodArgs)
{
	logMessage("INFO", "Base: "+base_ICAO);
	logMessage("INFO", "Region: "+region);
	logMessage("INFO", "min_range: "+min_range);
	logMessage("INFO", "max_range: "+max_range);
	logMessage("INFO", "min_demand: "+min_demand);
	logMessage("INFO", "threshold: "+threshold);
	logMessage("INFO", "filter: "+filter);
	logMessage("INFO", "levels: "+levels);
	logMessage("INFO", "cargo: "+cargo);	
}
else
{
	usage();
	casper.exit();
}
// only do login check if all params available
phantom.injectJs('login.js'); 

var results = [];
var seat_class = [ "Y", "C", "F" ];
var cargo_class = ["Light", "Standard", "Heavy"];
var pageNr = 0;


casper.then(function() {
	casper.thenOpen("http://www.airwaysim.com/game/Routes/Planning/" + base_ICAO, function() {
		this.waitUntilVisible('#airportSelectedTable_1_0 > div.borderOuter > div.borderInner.smallDataBox2 > table > thead > tr:nth-child(2)', 
		
		function() {
			// fill in the form
			this.evaluate(function(area, operator) {
				$('#Area_2_0').val(area).change();

				$("#filter-trafficSize" + " option").filter(function() {
					return this.text.trim() == operator;
				}).prop('selected', true);
			}, region, levelOp);

			if (filter)
				this.click("#filterOwnRoutes2_0");
			
			this.fill('#searchForm2_0', {
	//			'Size':    levelStr[0],
				'trafficSize': levelStr,
				'RangeMin':    min_range,
				'RangeMax':    max_range,
				//'filterOwnRoutes': "true"
			}, false);		

			//console.log(JSON.stringify(this.getFormValues('#searchForm2_0'), null, 4));
			
			this.thenClick('#airportSearch_2_0 > thead > tr:nth-child(2) > td.Bg3.alCenter > input[type="submit"]', function() {
				this.waitForText('Number of results: ', function() {
				resCount = this.fetchText('#airportSearchTable_2_0 > div.borderOuter > div.borderInner.smallDataBox2 > table > thead > tr:nth-child(1) > td.BgNr.alRight');

				//console.log("resCount = " +resCount.replace(/\D+/, ''));
				processLinks();
				});
			});		
		}, 
		
		
		function()
		{
			this.capture('../tmp/xrerror.png');
			console.log ("timeout");
		}, 20000);


	});
});

var nextPageBtn = '#airportSearchTable_2_0 > div.borderOuter > div.borderInner.smallDataBox2 > div.listingTableButtons > div.listingButton.flRight.alRight > button';

var highlightedPage = '#airportSearchTable_2_0 > div.borderOuter > div.borderInner.smallDataBox2 > div.listingTableButtons > div.listingPages > span';

ICAO_Codes= {};
dead = false;

function processLinks()
{
	pageNr++;

	
	casper.then(function() {
		//console.log("Page = "+pageNr);

		// grab the links
		casper.each(this.getElementsInfo('#airportSearchTable_2_0 > div.borderOuter > div.borderInner.smallDataBox2 > table > tbody > tr > td:nth-child(2)'),
			function(casper, icao_code) {
				var c=icao_code.text.trim();
				//console.log(c);
				ICAO_Codes[c] = 1;
			});

		

		casper.then(function() {
		// traverse remaining pages
			if (this.visible(nextPageBtn))
			{

				this.thenClick(nextPageBtn, function() {
					casper.waitForSelectorTextChange ('#airportSearchTable_2_0 > div.borderOuter > div.borderInner.smallDataBox2 > table > tbody > tr:nth-child(1) > td:nth-child(2)',

					function found() {
						casper.then(processLinks);
					},
					
					function timeout() {
						logMessage('DEBUG', "Dead");
				
						dead = true;
					}, 
					15000);
				});

			}
			else
			{
				dead = true;
			}
		});
		if (dead) return;
	
	});
}

casper.then(function()
{
	//console.log(JSON.stringify(Object.keys(ICAO_Codes)));
	this.getDemandFromDestList(base_ICAO, Object.keys(ICAO_Codes),  threshold, min_demand, function(x) 
	{
		results = x; 

		casper.then(function() {
			//console.log("results =\n" + JSON.stringify(results, null, 4));
			header_str = "ICAO,IATA,dist_nm,demand,supply,my_supply"; 
			
			console.log(header_str);
			
			results.sort(function (a, b) {
				if (parseInt(a.demand) > parseInt(b.demand))
					return -1;
				else if (parseInt(a.demand) < parseInt(b.demand))
					return 1;
				else if (a.airport > b.airport)
					return 1;
				else if (a.airport < b.airport)
					return -1;
				else
					return 0;
			});
	
			for (i=0; i < results.length; i++)
			{
				var rowNumber = parseInt(i + 2);
				outstr = results[i].airport + ","  + results[i].iata_code + ","  + results[i].distance + ",";
				outstr += results[i].demand + "," + results[i].supply + "," + results[i].my_supply;
				
				console.log(outstr);
			}
		});
	
	});
	//this.exit(1);
});

function getPaxDemand(scriptBlock, daily_pax_demand, my_daily_pax_supply, total_daily_pax_supply)
{
	re = /(<chart.*\/chart>)/m;
	xmlStr = re.exec(scriptBlock)[0];

	dp = new DOMParser();
	xDoc = dp.parseFromString(xmlStr, "text/xml");	

	for (c=0; c < seat_class.length; c++)
	{
		cls = seat_class[c];
			
		// parse demand
		dem_xp = '//*[@seriesName="Demand ' + seat_class[c] + '"]/set/@value';
		var dem_iter = xDoc.evaluate(dem_xp, xDoc, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null );
		thisNode = dem_iter.iterateNext();

		i=0;
		//console.log("Demand: "+dem_xp);
		while (thisNode) {
			//console.log( "\t" + thisNode.value );
			daily_pax_demand[cls][i] = parseInt(thisNode.value);
			daily_pax_demand.total[i] += parseInt(thisNode.value);

			thisNode = dem_iter.iterateNext();
			i++;
		}
		
		// parse my supply
		supply_xp = '//*[@seriesName="My supply ' + seat_class[c] + '"]/set/@value';
		var supp_iter = xDoc.evaluate(supply_xp, xDoc, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null );
		thisNode = supp_iter.iterateNext();

		i=0;
		//console.log("My supply "+cls+":");
		while (thisNode) {
			//console.log( "\t" + thisNode.value );
			my_daily_pax_supply[cls][i] = parseInt(thisNode.value);
			my_daily_pax_supply.total[i] += parseInt(thisNode.value);

			thisNode = supp_iter.iterateNext();
			i++;
		}		
	}

	// parse total supply
	tot_supp_xp = '//*[@seriesName="Total supply"]/set/@value';
	var tot_supp_iter = xDoc.evaluate(tot_supp_xp, xDoc, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null );
	var thisNode = tot_supp_iter.iterateNext();

	i=0;
	//console.log("Total supply: ");
	while (thisNode) {
		//console.log( "\t" + thisNode.value );
		total_daily_pax_supply[i] = parseInt(thisNode.value);

		thisNode = tot_supp_iter.iterateNext();
		i++;
	}
}

function getCargoDemand(scriptBlock, daily_cargo_demand, my_daily_cargo_supply, total_daily_cargo_supply)
{
	re = /(<chart.*\/chart>)/m;
	xmlStr = re.exec(scriptBlock)[0];

	dp = new DOMParser();
	xDoc = dp.parseFromString(xmlStr, "text/xml");

	for (c=0; c < cargo_class.length; c++)
	{
		cls = cargo_class[c];
			
		// parse demand
		dem_xp = '//*[contains(@seriesName, "Current demand ' + cls + ' cargo")]/set/@value';
		var dem_iter = xDoc.evaluate(dem_xp, xDoc, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null );
		thisNode = dem_iter.iterateNext();

		i=0;
		//console.log("Current demand: "+dem_xp);
		while (thisNode) {
			//console.log( "\t" + thisNode.value );
			daily_cargo_demand[cls][i] = parseInt(thisNode.value);
			daily_cargo_demand.total[i] += parseInt(thisNode.value);

			thisNode = dem_iter.iterateNext();
			i++;
		}
		
		// parse my supply
		supply_xp = '//*[contains(@seriesName, "My supply ' + cls + ' cargo")]/set/@value';
		var supp_iter = xDoc.evaluate(supply_xp, xDoc, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null );
		thisNode = supp_iter.iterateNext();

		i=0;
		//console.log("My supply "+cls+":");
		while (thisNode) {
			my_daily_cargo_supply[cls][i] = parseInt(thisNode.value);
			my_daily_cargo_supply.total[i] += parseInt(thisNode.value);

			thisNode = supp_iter.iterateNext();
			i++;
		}
		
		// parse total supply
		tot_supp_xp = '//*[contains(@seriesName, "Supply ' + cls + ' cargo")]/set/@value';
		var tot_supp_iter = xDoc.evaluate(tot_supp_xp, xDoc, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null );
		var thisNode = tot_supp_iter.iterateNext();

		i=0;
		//console.log("Total supply: ");
		while (thisNode) {
			//console.log( "\t" + thisNode.value );
			total_daily_cargo_supply[i] = parseInt(thisNode.value);

			thisNode = tot_supp_iter.iterateNext();
			i++;
		}		
	}
}


casper.getDemandFromDestList = function (base_ICAO, destination_codes, threshold, min_demand, callback) {
	var res = [];
	var url = 'http://www.airwaysim.com/game/Routes/Planning/X/';

	casper.each(destination_codes, function(casper, dest_ICAO, index) 
	{
		var daily_pax_demand = { "Y" : [0,0,0,0,0,0,0], "C" : [0,0,0,0,0,0,0], "F" : [0,0,0,0,0,0,0], "total" : [0,0,0,0,0,0,0] };
		var total_daily_pax_supply = [0,0,0,0,0,0,0];
		var my_daily_pax_supply ={ "Y" : [0,0,0,0,0,0,0], "C" : [0,0,0,0,0,0,0], "F" : [0,0,0,0,0,0,0], "total" : [0,0,0,0,0,0,0] };

		var daily_cargo_demand = { "Light" : [0,0,0,0,0,0,0], "Standard" : [0,0,0,0,0,0,0], "Heavy" : [0,0,0,0,0,0,0], "total" : [0,0,0,0,0,0,0] };
		var my_daily_cargo_supply ={ "Light" : [0,0,0,0,0,0,0], "Standard" : [0,0,0,0,0,0,0], "Heavy" : [0,0,0,0,0,0,0], "total" : [0,0,0,0,0,0,0] };
		var total_daily_cargo_supply = [0,0,0,0,0,0,0];
		
		if (base_ICAO == dest_ICAO)
		{
			return;
		}
		
		this.thenOpen(url + base_ICAO + '/' + dest_ICAO + '/', function() {
			this.waitForText('General information', function() {
				//var dest_IATA= this.getElementInfo('#routePlanningData > div > div.borderInner > table > thead > tr:nth-child(7) > td > table > tbody > tr:nth-child(2) > td:nth-child(1)');
				var dest_IATA = this.getElementInfo('a[href="/game/Routes/Airport/X/' + dest_ICAO + '/"]').text.split(/ /)[2];
				
				//console.log(JSON.stringify(this.getElementsInfo(x('//*[starts-with(@seriesname, "Demand ")]/set')), null, 4));

				if (!cargo)
				{
					dem_xpath = x('//div[@id="chartPaxDemand"]/following-sibling::script');
					script = this.getElementInfo(dem_xpath);
					getPaxDemand(script.text, daily_pax_demand, my_daily_pax_supply, total_daily_pax_supply);
					demand = parseInt(this.fetchText('#routePlanningData > div > div.borderInner > table:nth-child(2) > thead > tr:nth-child(4) > td:nth-child(2)').trim().replace(/\D+/g, ''));
					supply = Math.max.apply(null, total_daily_pax_supply);
					my_supply = Math.max.apply(null, my_daily_pax_supply.total);
				}
				else
				{
					cargo_demand_xpath = x('//div[@id="chartCargoDemand"]/following-sibling::script');
					script = this.getElementInfo(cargo_demand_xpath);	
					getCargoDemand(script.text, daily_cargo_demand, my_daily_cargo_supply, total_daily_cargo_supply);
					demand = parseInt(this.fetchText(x('//td[contains(text(), "Estimated cargo demand")]/following-sibling::td')).trim().replace(/\D+/g, ''));
					supply = Math.max.apply(null, total_daily_cargo_supply);
					my_supply = Math.max.apply(null, my_daily_cargo_supply.total);
				}

				
				//console.log(dest_ICAO + ": " + this.fetchText('#routePlanningData > div > div.borderInner > table:nth-child(2) > thead > tr:nth-child(4) > td:nth-child(2)').trim());
				var distance_nm = parseInt((this.fetchText(x('//*[@id="routePlanningData"]/div/div[2]/table[1]/thead/tr[3]/td[2]')).trim().split(/ /))[0]);
				//console.log(dest_ICAO + "," + dest_IATA );
				
				var obj = { 
					airport: dest_ICAO,
					iata_code: dest_IATA,
					distance: distance_nm,
					demand: demand,
					supply: supply,
					my_supply: my_supply,
				};
			
				//console.log(JSON.stringify(obj, null, 4));
				if ((threshold > 0 && demand - supply >= threshold) || (min_demand > 0 && demand >= min_demand))
				{
					res.push(obj);
					//console.log("Adding "+JSON.stringify(obj, null, 4));     
				}
				else
				{
					//console.log("Below threshold "+JSON.stringify(obj, null, 4));
				}

			},

			function timeout()
			{
				this.capture(tempDir + 'error.png');

			}, 
			10000);
		});
	});

	casper.then(function()
	{
		//console.log("getDemandFromDestList::\n"+JSON.stringify(res, null, 4));
		callback(res);
	});
};

casper.run();
