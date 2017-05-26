phantom.libraryPath = '/home/delano/js';

phantom.injectJs( 'global.js'); 
phantom.injectJs( 'selectors.js');
phantom.injectJs( './login.js'); 

var submitBtn = 'input[type="submit"]';

function getRangeSelectVal(range)
{
	var rangeLimits = [ 0, 200, 400, 600, 800, 1000, 1500, 2000, 2500, 
						3000, 3500, 4000, 5000, 6000, 7000, 8000, 9000 ];

	var selectVal = 0;
	if (range === 0)
		return selectVal;
		
	for (var i=0; i < rangeLimits.length-1; i++)
	{
		if (rangeLimits[i] >= range)
			break;
		else
			selectVal = rangeLimits[i+1];
	}
	//console.log("range >= "+selectVal);
	return selectVal;
}

/**
 **
 **
 **/
casper.getLeaseAircraft = function(fleet_type_id, base_airport_iata, seat_config_id, keyword, range, callback)
{
	if (typeof callback !== "function")
	{
		return;
	}
	var UAMSearch;
	var outputJson = { "error" : "" };
	outputJson.base_airport_iata = base_airport_iata;
					
	// go to Used Aircraft Market
	var UAMAvailable = false;
	
	casper.thenOpen('http://www.airwaysim.com/game/Aircraft/Used', function()
		{
			this.waitForSelector('#aircraftMarketReloadButton > button > span', function() {
				searchForm = '#submenuContainer > div > form';
				
				UAMSearch = casper.getFormValues(searchForm);
				
				// create initial form search
				UAMSearch['filterAge'] = "20";
				UAMSearch['filterCond'] = "90";
				UAMSearch['filterFleet'] = fleet_type_id.toString();

				if (keyword !== undefined && keyword.length >= 3)
					UAMSearch['Keyword'] = keyword;
				if (range !== undefined && range > 0)
					UAMSearch['filterRange'] = getRangeSelectVal(range).toString();

				if (this.visible('#contentMain > div > div > div.Warn > div.Text'))
				{
					logMessage("ERROR", "UAM unavailable");
					outputJson.error = "UAM unavailable";
				}
				else
				{
					UAMAvailable = true;
				}
			});
		},
		
		function timeout() {
			logMessage('ERROR', "No reload button");
			outputJson.error = "No reload button";
		},
		
		5000
	);

	casper.then(
		function()
		{
			if (!UAMAvailable)
			{
				callback(outputJson);
				this.exit(0);
			}
		}
	);

	lease_link = '#aircraftData > form > table > tbody > tr > td:nth-child(8) > a:nth-child(3)';

	casper.then(
		function()
		{
//			console.log(JSON.stringify(UAMSearch, null, 4));
			this.fill(searchForm, UAMSearch, false);
			this.evaluate(function(formSelector){
				 document.querySelector(formSelector).submit();
			}, searchForm);	
		}
	);

	var leaseLinks = [];

	casper.then(
		function()
		{
			leaseLinkSelector = x('//a[text()="' + keyword + '"]/parent::td/parent::tr/td/a[3]');
			//console.log(JSON.stringify(this.getElementsInfo(x('//a[text()="' + keyword + '"]/parent::td/parent::tr/td/a[3]')), null, 4));
			//this.exit(1);
			if (UAMAvailable) {
//this.capture('c:/tmp/lease.png')
				this.waitForSelector(leaseLinkSelector, function() {
					leaseLinks = this.getElementsInfo(leaseLinkSelector);
				},
				
				function fail() {
					//console.log("Failed to find links with model name");
					outputJson.error = "Failed to find keyword ["+keyword+"]";
				});
			}
		}
	);

	
	casper.then(function() 
	{
		options = { 
			"base_airport_iata" : base_airport_iata, 
			"seat_config_id" : seat_config_id
			};
		if (UAMAvailable)
		{
			success = 89;
			//success = false;
			doLease(leaseLinks, 0, options, function(MSN, registration, cost, monthly)
				{
					if (MSN !== undefined)
					{
						success = 8900;
						outputJson.MSN = MSN;
						outputJson.registration = registration;
						outputJson.cost = cost;
						outputJson.monthly = monthly;
						
						//console.log(success, JSON.stringify(outputJson, null, 4));
					}
				});
			
		}
	});
	
	casper.then(
		function()
		{
			//console.log(JSON.stringify(outputJson, null, 4));
			callback(outputJson);
		}
	);	
};

function doLease(links, index, options, callback)
{
	if (index >= links.length)
	{
		callback(undefined, undefined, undefined, undefined);
		return;
	}
	
	var submitBtn = 'input[type="submit"]';
	casper.thenOpen(gameHost + links[index].attributes.href, function()
	{
		this.waitUntilVisible(submitBtn, 
		
		function found()
		{
			var re = /Lease\/(\d+)/g;
			MSN = re.exec(links[index].attributes.href)[1];
			//this.echo(this.getCurrentUrl());

			// base airport
			baseValue = 0;
			if (this.exists('#baseID'))
			{
				baseValue = this.getElementInfo(x('//select/option[contains(text(), "' + options.base_airport_iata + '")]')).attributes.value;
				this.evaluate(function(baseID) {
					$('#baseID').val(baseID).change();
				}, baseValue);			}
			else
			{
				fields = this.getFormValues('form')
				//console.log(JSON.stringify(fields));
				re = /reg\[(\d+)/;
				for (a in fields)
				{
					//console.log(a);
					q = re.exec(a);
					if (q === null)
						continue;
					
					baseValue = q[1];
					break;
				}
			}

			options.seat_config_id = this.getElementInfo(x('//select/option[contains(text(), "Std")]')).attributes.value;

			// at the end of the game, 18 month leases become impossible; 
			// just get max possible
			maxLeaseValue = this.evaluate(function()
			{
				return $('#LeaseLength option:last').val();
			});
			
			leaseLength = Math.min(18, maxLeaseValue);
			leaseCostSelector = '#leaseCost' + (leaseLength >= 12 ? 12 : leaseLength) +' > span';
			
			this.evaluate(function(DlvConfig, length) {
				$('#DlvConfig').val(DlvConfig).change();
				$('#LeaseLength').val(length).change();
			}, options.seat_config_id, leaseLength);
			

			regPrefix = this.getElementInfo(x('//*[@id="regBox' + baseValue +'"]')).text;
			regPrefix = regPrefix.trim().split("(")[0];

			formData = this.getFormValues('#noBorderArea > div.borderOuter > div > form');
//console.log(JSON.stringify(formData, null, 4));
//casper.exit(1);
			
			registration = regPrefix + formData['reg[' + baseValue + ']'];
			
			this.waitForSelector(leaseCostSelector);

			cost = this.getElementInfo('#DeliveryCostShow > span').text.trim();
			cost = cost.replace(/\D+/g, '');
			
			leaseCost = this.getElementInfo(leaseCostSelector).text.trim();
			monthly = leaseCost.replace(/\D+/g, '');
			
			this.click(submitBtn);
			callback(MSN, registration, cost, monthly);
		},

		function fail() {
			doLease(links, index + 1, options, callback);
		},

		2000);
	});	
}



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

var gameHost = "http://www.airwaysim.com";

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
					  "[--fleet-type=<icao-code> ("+ keys.join("|") + ")] OR \n\t" +
					  "[--fleet-type-id=<fleet_type_id> (" + vals.join("|") + ")]\n" +
					  "[--seat-config-id=<seat-config-id>]\n" +
					  "[--base=<base-airport-iata>] (optional)\n" +
					  "[--range=<min-range>] (optional)\n" + 
					  "[--keyword=<search-string>] (optional)"
				  );
	casper.exit(1);
}

	
if (casper.cli.has('h') || (!casper.cli.has('fleet-type') && !casper.cli.has('fleet-type-id')) || !casper.cli.has('seat-config-id'))
{
	usage();
	console.log("Missing fleet-type or fleet-type-id");
	casper.exit(1);
}

// fleet_type_id
var fleet_type_id = 0;
if (casper.cli.has('fleet-type'))
{
	var fleet = types[casper.cli.get("fleet-type").toUpperCase()];
	if (fleet === undefined)
	{
		logMessage("ERROR", "Fleet type [" + fleet + "] not found");
		usage();
	}
	fleet_type_id = fleet.fleet_type_id;
}
else if (casper.cli.has('fleet-type-id'))
{
	fleet_type_id = parseInt(casper.cli.get("fleet-type-id"));
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
logMessage("INFO", "fleet_type_id = "+fleet_type_id);

// seat_config_id
var seat_config_id = parseInt(casper.cli.get("seat-config-id"));
if (isNaN(seat_config_id))
{
	logMessage("ERROR", "Invalid seat_config_id [" + seat_config_id + "]");
	usage();
}
logMessage("INFO", "seat-config-id = "+seat_config_id);


// base airport-iata
var base_airport_iata;
if (casper.cli.has('base'))
{
	base_airport_iata = casper.cli.get("base").toUpperCase();
	if (base_airport_iata.search(/^[A-Z]{3}$/) == -1)
	{
		logMessage("ERROR", "Invalid base_airport_iata [" + base_airport_iata + "]");
		usage();		
	}
	logMessage("INFO", "base_airport_iata = "+base_airport_iata);
}


// range
var range;
if (casper.cli.has('range'))
{
	range = parseInt(casper.cli.get("range"));
	if (isNaN(range))
	{
		logMessage("ERROR", "Invalid range [" + range + "]");
		usage();
	}
	logMessage("INFO", "range = "+range+ " nm");
}

var keyword;
if (casper.cli.has('keyword'))
{
	keyword = casper.cli.get("keyword");
	logMessage("INFO", "keyword = ["+keyword+ "]");
}

leaseLinks = [];
casper.then(function() 
	{
		this.getLeaseAircraft(fleet_type_id, base_airport_iata, seat_config_id, keyword, range, function(results)
		{
			console.log(JSON.stringify(results, null, 4));
		});
	}
);


casper.run();
