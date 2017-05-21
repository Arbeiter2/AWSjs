/*
get_fleet.js
*/

phantom.libraryPath = '/home/delano/js';

phantom.injectJs( './global.js'); 
phantom.injectJs( 'selectors.js'); 

var options = ['game_id', 'base', 'region', 'min-range', 
			   'max-range', 'threshold', 'level'];
var goodArgs = true;
function usage()
{
console.log(argv[0] + requiredArgs.join("\n") + "\n" +
					  "--h\tthis message" + "\n" +
					  "--base=<airport ICAO code>\n" +
					  "--region=<region code> (WO|NA|EU|AF|AS|SA|OC)\n" +
					  "[--min-range=<minimum range>]\n" +
					  "[--max-range=<maximum range>]\n" +
					  "[--threshold=<min demand>]\n" +
					  "--level=<airport level>[+] (0=All|1=Insignificant|2=Small|3=Middle-size|4=Significant|5=Large");
}

var url = 'http://www.airwaysim.com/game/Routes/Planning/X/'; 
var links = [];
var i = 0;

for (opt in casper.cli.options)
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
	if (levelStr.match(/^[0-5]\+?$/) === null)
	{
		goodArgs = false;
	}
	else
	{
		var levels = [];
		if (levelStr[0] === "0")
			levels = levelStr[0];
		else
		{
			if (levelStr[levelStr.length-1] == '+')
			{
				for (var i=parseInt(levelStr[0], 10); i <=5; i++)
					levels.push('' + i);
			}
			else
			{
				levels.push(levelStr);
			}
		}
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

if (goodArgs)
{
	logMessage("INFO", "Base: "+base_ICAO);
	logMessage("INFO", "Region: "+region);
	logMessage("INFO", "min_range: "+min_range);
	logMessage("INFO", "max_range: "+max_range);
	logMessage("INFO", "Levels: "+levels);
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
var pageNr = 0;


casper.then(function() {
	casper.each(levels, function(casper, level) {
		casper.thenOpen("http://www.airwaysim.com/game/Routes/Planning/" + base_ICAO, function() {
			this.waitUntilVisible('#airportSelectedTable_1_0 > div.borderOuter > div.borderInner.smallDataBox2 > table > thead > tr:nth-child(2) > td > a', 
			
			function() {
				// fill in the form
				this.evaluate(function(area) {
					$('#Area_2_0').val(area).change();
				}, region);
				
				this.fill('#searchForm2_0', {
					'Size':    level,
					'RangeMin':    min_range,
					'RangeMax':    max_range,
					'filterOwnRoutes': 'true'
				}, false);		

				//console.log(JSON.stringify(this.getFormValues('#searchForm2_0'), null, 4));
				
				this.thenClick('#airportSearch_2_0 > thead > tr:nth-child(2) > td.Bg3.alCenter > input[type="submit"]', function() {
					this.waitForText('Number of results: ', function() {
					resCount = this.fetchText('#airportSearchTable_2_0 > div.borderOuter > div.borderInner.smallDataBox2 > table > thead > tr:nth-child(1) > td.BgNr.alRight');

					console.log("resCount = " +resCount.replace(/\D+/, ''));
					processLinks();
					});
				});		
			}, 
			
			
			function() { console.log ("timeout");}, 3000);


		});
	});
})

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
						//casper.waitForSelectorTextChange(ManageRouteSelectors.currentPage, //function() {
						casper.waitForSelector(highlightedPage,

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
	this.getDemandFromDestList(Object.keys(ICAO_Codes));
	//this.exit(1);
});



casper.getDemandFromDestList = function (destination_codes) {
casper.each(destination_codes, function(casper, dest_ICAO, index) {
var daily_demand = { "Y" : [0,0,0,0,0,0,0], "C" : [0,0,0,0,0,0,0], "F" : [0,0,0,0,0,0,0], "total" : [0,0,0,0,0,0,0] };
var total_daily_supply = [0,0,0,0,0,0,0];
var my_daily_supply ={ "Y" : [0,0,0,0,0,0,0], "C" : [0,0,0,0,0,0,0], "F" : [0,0,0,0,0,0,0], "total" : [0,0,0,0,0,0,0] };
var net_daily_supply = [0,0,0,0,0,0,0];
	
	if (base_ICAO == dest_ICAO)
	{
		return;
	}
	
    this.thenOpen(url + base_ICAO + '/' + dest_ICAO + '/', function() {
	this.waitForText('General information', function() {
		//var dest_IATA= this.getElementInfo('#routePlanningData > div > div.borderInner > table > thead > tr:nth-child(7) > td > table > tbody > tr:nth-child(2) > td:nth-child(1)');
		var dest_IATA = this.getElementInfo('a[href="/game/Routes/Airport/X/' + dest_ICAO + '/"]').text.split(/ /)[2];
		
	//console.log(JSON.stringify(this.getElementsInfo(x('//*[starts-with(@seriesname, "Demand ")]/set')), null, 4));

	dem_xpath = x('//*[@id="routePlanningData"]/div/div[2]/table[1]/thead/tr[8]/td/script');
	dem = this.getElementInfo(dem_xpath);	
	re = /(<chart.*\/chart>)/m;
	
	xml = re.exec(dem.text);
	//console.log(JSON.stringify(xml, null, 4));
	
	dp = new DOMParser();
	xDoc = dp.parseFromString(xml[0], "text/xml");		
		
	// get daily demand, and my daily supply
	for (c=0; c < seat_class.length; c++)
	{
		cls = seat_class[c];
			
		// parse demand
		dem_xp = '//*[@seriesName="Demand ' + seat_class[c] + '"]/set/@value';
		var dem_iter = xDoc.evaluate(dem_xp, xDoc, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null );
		thisNode = dem_iter.iterateNext();

		i=0;
		//console.log("Demand: ");
		while (thisNode) {
			//console.log( "\t" + thisNode.value );
			daily_demand[cls][i] = parseInt(thisNode.value);
			daily_demand.total[i] += parseInt(thisNode.value);

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
			my_daily_supply[cls][i] = parseInt(thisNode.value);
			my_daily_supply.total[i] += parseInt(thisNode.value);

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
		total_daily_supply[i] = parseInt(thisNode.value);

		thisNode = tot_supp_iter.iterateNext();
		i++;
	}		


	// average demand
	demand = parseInt(this.fetchText('#routePlanningData > div > div.borderInner > table:nth-child(2) > thead > tr:nth-child(4) > td:nth-child(2)').trim().replace(/\D+/g, ''));
	//demand = Math.min.apply(null, daily_demand.total);
	
	// max supply
	//supply = Math.max.apply(null, net_daily_supply);
	supply = Math.max.apply(null, total_daily_supply);
	
	// max my supply
	my_supply = Math.max.apply(null, my_daily_supply.total);
	
	//console.log(dest_ICAO + ": " + this.fetchText('#routePlanningData > div > div.borderInner > table:nth-child(2) > thead > tr:nth-child(4) > td:nth-child(2)').trim());
	var distance_nm = parseInt((this.fetchText(x('//*[@id="routePlanningData"]/div/div[2]/table[1]/thead/tr[3]/td[2]')).trim().split(/ /))[0]);
	//console.log(dest_ICAO + "," + dest_IATA );
	
	//console.log(dest_IATA, distance_nm, demand, supply);
	if (demand - supply >= threshold)
		results.push({ airport: dest_ICAO, 
			iata_code: dest_IATA, 
			distance: distance_nm, 
			demand: demand, 
			supply: supply, 
			my_supply: my_supply });

	},

	function timeout()
	{
		this.capture(tempDir + 'error.png');

	}, 
	10000);
	});
});

casper.then(function() {
	//console.log("results =\n" + JSON.stringify(results, null, 4));
	//header_str = "ICAO,IATA,dist_nm,demand,my_supply"; 
	header_str = "ICAO,IATA,dist_nm,demand,supply,my_supply"; 
	/*
	for (i=0; i < 7; i++) header_str += ",D_Y_" + (i+1);
	for (i=0; i < 7; i++) header_str += ",D_C_" + (i+1);
	for (i=0; i < 7; i++) header_str += ",D_F_" + (i+1);

	for (i=0; i < 7; i++) header_str += ",MS_Y_" + (i+1);
	for (i=0; i < 7; i++) header_str += ",MS_C_" + (i+1);
	for (i=0; i < 7; i++) header_str += ",MS_F_" + (i+1);
	
	for (i=0; i < 7; i++) header_str += ",TS_" + (i+1);

	for (i=0; i < 7; i++) header_str += ",UD_" + (i+1);
	*/
	
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
	
		/*
		outstr += results[i].demand.Y.join(",") + ",";
		outstr += results[i].demand.C.join(",") + ",";
		outstr += results[i].demand.F.join(",") + ",";

		outstr += results[i].my_supply.Y.join(",") + ",";
		outstr += results[i].my_supply.C.join(",") + ",";
		outstr += results[i].my_supply.F.join(",") + ",";
		
		outstr += results[i].supply.join(",") + ",";
		
		qp = results[i].demand.total.map(function(val, index) {
			return (val - results[i].supply[index] >= threshold ? val - results[i].supply[index] : 0);
		});
		
		outstr += qp.join(",");
		*/
		//outstr += results[i].demand - results[i].supply + "," + results[i].my_supply;
		outstr += results[i].demand + "," + results[i].supply + "," + results[i].my_supply;
		
		console.log(outstr);
	}
});
};

/*
casper.then(function() {
	//console.log("results =\n" + JSON.stringify(results, null, 4));
	console.log("ICAO,IATA,dist_nm,pax,flights,b733,f50,block");
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
		//console.log(results[i].airport + "," + results[i].distance + ","  + results[i].demand, ",=INT(C" + rowNumber + "/125),=INT(C" + rowNumber + "/68)");
		f50_val = b733_val = block = 0;
		if (results[i].distance > 1290)
		{
			if (results[i].demand >= 125)
				b733_val = results[i].demand/125;
			else if (results[i].demand > 80)
			{
				b733_val = results[i].demand/80;
				block = results[i].demand;
			}
		}
		else
		{
			if (results[i].demand >= 125)
				b733_val = results[i].demand/125;
			else if (results[i].demand > 80)
			{
				b733_val = results[i].demand/80;
				block = results[i].demand;
			}
			else if (results[i].demand >= 52)
			{
				f50_val = results[i].demand/52;
			}
			else if (results[i].demand >= 40)
			{
				f50_val = results[i].demand/40;
				block = results[i].demand;
			}
		}
	
		console.log(results[i].airport + ","  + results[i].iata_code + ","  + results[i].distance + ","  + results[i].demand + "," + 
			results[i].flights + "," + parseInt(b733_val) + "," + parseInt(f50_val) + "," + block);
	}
});
*/
casper.run();
