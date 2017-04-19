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
					  "--base=<airport ICAO code>\n" +
					  "--region=<region code> (NA|EU|AF|AS|SA|OC)\n" +
					  "--level=<airport level>");
}

var url = 'http://www.airwaysim.com/game/Routes/Planning/X/'; 
var threshold = 60;
var links = [];

var icao_codes =  {

"NA" : {
	"1" : [
	"KLAS", "KATL", "KIAH", "KMIA", "KSEA", "KEWR", "KMCO", "KMSP",
	"KDTW", "KBOS", "KPHL", "KLGA", "KFLL", "KBWI", "KIAD", "KMDW",
	"KSLC", "KDCA", "PHNL", "KSAN", "KTPA", "KPDX", "CYYZ", "CYUL",
	"CYVR", "CYYC", "MMMX", "KJFK", "KLAX", "KSFO", "KORD", "KDEN",
	"KPHX",
	],

	"2" : [
	"KSTL", "KHOU", "KBNA", "KAUS", "KOAK", "KMCI", "KMSY", "KRDU", 
	"KSJC", "KSNA", "KDAL", "KSMF", "TJSJ", "KSAT", "KRSW", "KPIT", 
	"KCLE", "KIND", "KMKE", "KCMH", "PHOG", "KPBI", "KBDL", "KCVG", 
	"KJAX", "PANC", "KBUF", "KABQ", "KONT", "KOMA", "KBUR", "CYEG",
	"CYOW", "MMUN"
	],

	"3" : [
	"TIST", "PAFA", "PHTO", "PHLI", "PHKO", "KOKC", "KMEM", "KPVD", 
	"KRIC", "KSDF", "KRNO", "KTUS", "KCHS", "KORF", "KGEG", "KGUM", 
	"KELP", "KBOI", "KTUL", "KLGB", "KBHM", "KALB", "KGRR", "KROC", 
	"KDSM", "KDAY", "KSFB", "KMHT", "KLIT", "KSYR", "KPSP", "KGSP", 
	"KSAV", "KMYR", "KGSO", "KTYS", "KPWM", "KMSN", "KCAK", "KPNS", 
	"KICT", "KHPN", "KFAT", "KIWA", "KPIE", "KISP", "KMDT", "KCOS", 
	"KXNA", "KBTV", "KSRQ", "KLEX", "KACY", "KCID", "KMAF", "KBLI", 
	"KJAN", "KHSV", "KCAE", "KGSN", "KFSD", "KBZN", "KFAR", "KLBB", 
	"KEUG", "KFNT", "KBIL", "KSGF", "KECP", "KMFE", "KEYW", "KAVL",
	"MPTO", "MMSD", "KCLT",
	],

	"4" : [
	"KBTR", "KILM", "KTTN", "PAJN", "KMLI", "KAMA", "KVPS", "KCHA", 
	"KCRP", "KGCN", "KTLH", "KPGD", "KSBA", "KMSO", "KPSC", "KGPT", 
	"KMFR", "KFWA", "KPIA", "KBGR", "KSBN", "KJAC", "KSHV", "KDAB", 
	"KROA", "KGRB", "KABE", "KHRL", "KMOB", "KRAP", "KAGS", "KPHF", 
	"KRDM", "KCHO", "KATW", "KBIS", "KLFT", "KCRW", "KFAY", "KGPI", 
	"KMOT", "KASE", "KTRI", "KAVP", "KMLB", "KGJT", "KBQN", "KBVU", 
	"KGNV", "KBMI", "KLAN",
	]
},

"EU" : {
	"1" : [
	'EHAM', 'LFPG', 'UUDD', 'EIDW', 'EDDF', 'EGKK', 'EGLL', 'LEMD', 
	'EGCC', 'EDDM', 'LIMC', 'UUEE', 'UUWW', 'LIRF',
	],

	"2" : [
	'ESSA', 'EBBR', 'EDDK', 'EKCH', 'EBCI', 'EGPH', 'EGPF', 'LSGG', 
	'EFHK', 'LIML', 'LPPT', 'EGGW', 'LFPO', 'ENGM', 'LKPR', 'EGSS', 
	'EDDB', 'LOWW', 'LSZH', 'LGAV', 'LEBL',
	],

	"3" : [
	'GCRR', 'LEMG', 'LRBS', 'EDDB', 'EGAA', 'EGBB', 'EGGD', 'LFSB', 
	'LHBP', 'LFOB', 'LICC', 'EDLW', 'EDDL', 'EHEH', 'EGNX', 'LPFR', 
	'GCFV', 'LIMJ', 'ESGG', 'EDDV', 'EDDH', 'EDFH', 'GCLP', 'EGGP', 
	'LMML', 'LIRN', 'LFMN', 'EGNT', 'EGPK', 'LEPA', 'EINN', 'GCTS', 
	'LEVC', 'EGPD', 'LYBE', 'LZIB', 'LDDU', 'LGIR', 'ULLI', 'LEMH', 
	'LPPR', 'LGRP', 'EHRD', 'LGTS', 'LBSF', 'GCLA', 'LATI', 'EYVI', 
	'EPWA', 'LDZA', 'LEIB', 'EDDS', 'GCXO', 'EDDT', 'LIPZ', 'EGLC', 
	'LJLJ', 'ELLX', 'LROP', 'LYPR', 'EVRA', 'LQSA', 'EPWR', 'LIRA', 
	],

	"4" : [
	'LIEA', 'LIME', 'LIPE', 'LIEE', 'LEGE', 'UKBB', 'EDLV', 'ESKN', 
	'EICK', 'LICJ', 'LIRP', 'LICR', 'LEST', 'LICA', 'LIMF', 'LIPH', 
	'LIPX', 'ENBR', 'LEBB', 'EKBI', 'LFBD', 'EGHH', 'LBBG', 'EDDW', 
	'LIBD', 'LGSA', 'UKDD', 'EGCN', 'LIRQ', 'LPMA', 'LOWG', 'LGKO', 
	'EGNM', 'LFBT', 'LEAM', 'LFQQ', 'LOWL', 'LELC', 'EGNV', 'LFMT', 
	'LFML', 'UMMS', 'LFRS', 'UKOO', 'LIEO', 'LPPD', 'LBPD', 'LERS', 
	'ENRY', 'UKFF', 'LWSK', 'EGHI', 'LDSP', 'ENZV', 'LEZL', 'LFST', 
	'LOWS', 'EETN', 'LFBO', 'ENVA', 'ENTO', 'LRTR', 'LBWN', 'LGZA', 
	'LEAL', 'LESO', 'LEGR', 'LECO', 'LFLL', 'GEML', 'LEAS', 'LEPP', 
	'LEXJ', 'GCHI', 'LEVX', 'LEVT', 'LEVD', 'LEJR', 'LEZG', 
	'GCGM', 'EDDN', 'URSS', 'LKTB', 'LGKR', 'EGBE', 'EDSB', 'EDDG', 
	'LIPK', 'EPGD', 'ESGP', 'UKHH', 'LGMK', 'LGSR', 'BIKF', 'LUKK', 
	'LOWK', 'EPKK', 'EPKT', 'UWWW', 'EDDP', 'URMM', 'EIKN', 'LKMT', 
	'EDLP', 'EPPO', 'URRR', 'LGSM', 'EFTP', 'UWUU', 'LELN', 

	],
},

"SA" : {
	"1" : [
	"SVMI", "SBSP", "SBCF", "SBCT", "SAEZ", "SBFZ", "SBGL", "SBGR",
	"SPIM", "SBPA", "SBRF", "SCEL", "SBRJ", "SBSV", "SEQU", "SBKP",
	]
},

"AS" : {
	"1" : [
	'VTBS', 'VHHH', 'WSSS', 'RJAA', 'RKSI', 'ZSPD', 'RCTP', 'RJBB', 
	],
	
	"2" : [
	'WMKK', 'OMDB', 'OTBD', 'ZBAA', 'WIII', 'RJTT', 'LTBA', 'VABB', 
	'RPLL', 'VIDP', 'OEJN', 'LTAI', 'OERK', 'ROAH', 'LLBG', 
	],
	
	"3" : [
	'ZSSS', 'OIIE', 'RKPC', 'RJGG', 'LTAC', 'OPKC', 'VVTS', 'UTTT', 
	'OYSN', 'ZSHC', 'ZLXY', 'RCKH', 'RKPK', 'ZJHK', 'VOMM', 'RCSS', 
	'OBBI', 'ZUUU', 'ZGGG', 'ZGSZ', 'RJOO', 'RJFF', 'RJCC',
	]
 },
 
 };

if (casper.cli.get("threshold"))
	threshold = parseInt(casper.cli.get("threshold"));

if (!casper.cli.get("region") || !casper.cli.get("level") || !casper.cli.get("base"))
{
	usage();
	casper.exit(1);
}

// base
var base_ICAO = casper.cli.get("base").toUpperCase();
if (!/^[A-Z]{4}$/.test(base_ICAO))
{
	usage();
	casper.exit(1);
}

// region
var region = casper.cli.get("region").toUpperCase();
if (icao_codes[region] === undefined)
{
	usage();
	casper.exit(1);
}

// validate level numbers and create complete list of ICAO codes

var level_list = casper.cli.get("level").toString();
var destination_codes =  [];

s = level_list.split(",");

for (i=0; i < s.length; i++)
	if (icao_codes[region][s[i]] === undefined)
	{
		usage();
		casper.exit(1);
	}
	else
		destination_codes = destination_codes.concat(icao_codes[region][s[i]]);



logMessage("INFO", "Base: "+base_ICAO);
logMessage("INFO", "Region: "+region);
logMessage("INFO", "Levels: "+s.join(", "));

// only do login check if all params available
phantom.injectJs('login.js'); 

var results = [];
var seat_class = [ "Y", "C", "F" ];


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
