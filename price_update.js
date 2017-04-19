phantom.libraryPath = '/home/delano/js';
phantom.injectJs( 'global.js'); 
phantom.injectJs( 'selectors.js');

function usage()
{
console.log(argv[3] + " " + requiredArgs.join("\n") + "\n" +
					  "--h\tthis message" + "\n" +
					  "--keyword=<flight number|airport code|fleet type|registration>" + "\n" +
					  "[--delta=<x|x%>]\t(optional) upward price change; default is (0.05|5%)");
}

if (casper.cli.has('h') || !casper.cli.has('keyword'))
{
    usage();
    casper.exit(1);
}

var keyword = casper.cli.get("keyword");
logMessage("INFO", 'keyword = ' + keyword);

var factor = 1.05;

if (casper.cli.has('delta'))
{
	var d = casper.cli.get("delta");
	if (typeof d === 'boolean' || d === null || d === '')
	{
		usage();
		casper.exit(1);
	}

	var m = d.toString().match(/^(\d+|\d+\.\d+)(%|)$/);
	if (m === null)
	{
		usage();
		casper.exit(1);		
	}
	
	var delta = m[1];
	
	// check if it's a percentage
	var f = 1.0 + delta * (m[2] == "%" ? 0.01 : 1.0);
	
	if (f < 0.75 || f > 1.5)
	{
		logMessage('ERROR', "Price change [" + f + "] outside bounds (0.75,1.5)");
		casper.exit(1);
	}
	else
	{
		factor = f;
	}
}
logMessage('INFO', "Price change = " + factor + " x reset value");

phantom.injectJs( 'login.js'); 
/*
price_update.js
*/
var startBad = '00:30';
var endBad = '05:10';
var timeCorrection = 0.77;

var host = 'http://www.airwaysim.com';
var airlineCode = null;

var newOutboundPrices;
var newInboundPrices;

/*
@prices [ Y, C, F ]
@times  [ departure, arrival ]
*/
function AdjustPrices(prices, times)
{
	var out = prices;

//	if ((times[0] >= startBad && times[0] <= endBad)
//	||  (times[1] >= startBad && times[1] <= endBad))

	// correct only for bad departure time
	//if (times[0] >= startBad && times[0] <= endBad)
	//{
		for (var i=0; i < 3; i++)
			out[i] = parseInt(prices[i] * 
							((times[0] >= startBad && times[0] <= endBad) ? timeCorrection : 1.0) * 
							factor);
	//}
	return out;
}

var srcUrls = [];
var links = [];
var aircraft = [];
var pageNr = 0;
var totalPages;
var dead = false;
var pageLimit = 20;

// use the manage routes page with the specific name
var searchURL = 'http://www.airwaysim.com/game/Routes/Manage/?Keyword=' + keyword;

casper.thenOpen(searchURL,

function processLinks()
{
	pageNr++;
	
	this.waitForSelector(ManageRouteSelectors.functionSelect, function() {}, function() {}, 3000);
	
	casper.then(function() {
		//console.log((pageNr)+" % "+pageLimit+" === "+(pageNr) % pageLimit);

		if (pageNr == 1)
		{
			//console.log(this.getCurrentUrl());
			
			// find number of select options = number of pages
			totalPages = this.evaluate(function(sel) {
				return document.querySelector('#routeForm > div.Small.alRight > select').length;
			});
			//console.log("totalPages = "+totalPages);
		}
		else if (pageNr % pageLimit === 0)
		{
			// start from scratch, by going to a new page and reloading
			this.thenOpen('http://www.airwaysim.com/game/Routes/Schedules/');
			this.thenOpen(searchURL);
			this.waitForSelector(ManageRouteSelectors.functionSelect, function() {}, function() { console.log("Uh-oh, no functionselect"); casper.exit(1); }, 3000);
			
			
			this.then(function() {

				this.evaluate(function(newVal) {
					$('#routeForm > div.Small.alRight > select').val(newVal).trigger('change');
				}, pageNr);
				
				casper.waitFor(
				
					function check() { return (this.getHTML(ManageRouteSelectors.currentPage).trim() == pageNr); },
					
					function done() { },	

					function undone() { 
						console.log("Fail! Never got to new page"); 
						console.log("currentPage = "+this.getHTML(ManageRouteSelectors.currentPage));
						logMessage("ERROR", "Unable to get to page "+pageNr);
						casper.exit(); 
					},

				10000);
			});

		}
	});
	
	
	casper.then(function() {
	//console.log("Page = "+this.getElementInfo(ManageRouteSelectors.currentPage).text.trim());

	// grab the links
	var pageLinks = this.getElementsInfo(ManageRouteSelectors.viewRouteLinks);
	links.push.apply( links, pageLinks );

	var aircraftLinks = this.getElementsInfo(ManageRouteSelectors.assignedAircraftCell);
	aircraft.push.apply( aircraft, aircraftLinks );
	
	logMessage('DEBUG', "Got " + pageLinks.length + " routes on page " + pageNr+"/"+totalPages);

	// traverse remaining pages
	if (this.exists(ManageRouteSelectors.pageSelector))
	{
		var checkCount = 0;
		// selected page number is highlighted in footer
		var pNr = parseInt(this.getElementInfo(ManageRouteSelectors.currentPage).text.trim(), 10);
		//console.log("on page "+pNr);
		
		if (pNr < totalPages)
		{
			
			this.thenClick(ManageRouteSelectors.nextPage, function() {
				//casper.waitForSelectorTextChange(ManageRouteSelectors.currentPage, //function() {
				casper.waitFor(

				function check() {
					checkCount++;
					return (this.getHTML(ManageRouteSelectors.currentPage).trim() == pNr + 1);
				},
				
				function found() {
					//console.log("checkCount = "+checkCount);

					casper.then(processLinks);
				},
				
				function timeout() {
					//console.log("checkCount = "+checkCount);

					logMessage('DEBUG', "Dead at "+pNr);
					logMessage('DEBUG', "span says: ["+this.getElementInfo(ManageRouteSelectors.currentPage).text.trim()+"]");
					logMessage('DEBUG', JSON.stringify(this.getElementInfo(ManageRouteSelectors.currentPage)));
					
					dead = true;
				}, 
				15000);
			});
		}
	}
if (dead) return;
});
});

casper.then(function() {
    if (airlineCode === null)
    {
        var m = links[0].html.match(/^(..)/);
        airlineCode = m[1];
    }
	logHTML("<table class='CSSTableGenerator'>\n<thead><tr><td>Status</td><td>Flt Num</td><td>Orig-Dest</td><td>Days</td><td>Comment</td></tr></thead>\n<tbody>\n");

});

var flNum;

casper.then(function () {
for (i=0; i < links.length; i++)
{
	var url = host + links[i].attributes.href.replace(/View/, 'Edit');
	this.thenOpen(url, function() {
		//console.log('Opening ' + url);
		//console.log('waiting for ' + EditRouteSelectors.confirm);
	});
	casper.waitForSelector(EditRouteSelectors.confirm,

	function found()
	{
		var base = this.getElementInfo(EditRouteSelectors.base).text;
		var destination = this.getElementInfo(EditRouteSelectors.destination).text;
		
		var outbound_dep_time = this.getFormValues(EditRouteSelectors.form).Dep1H + ':' + this.getFormValues(EditRouteSelectors.form).Dep1M;
		var outbound_arr_time  = this.getHTML(EditRouteSelectors.outbound_arr_tm).trim().replace(/ h /, ':').replace(/ min.*/, '');
		var inbound_dep_time   = this.getHTML(EditRouteSelectors.inbound_dep_tm).trim().replace(/ h /, ':').replace(/ min.*/, '');
		var inbound_arr_time   = this.getHTML(EditRouteSelectors.inbound_arr_tm).trim().replace(/ h /, ':').replace(/ min.*/, '');
		
		// build string showing operating days of flight
		var days = "";
		for (var i=0; i < 7; i++)
			days = days + (this.getFormValues(EditRouteSelectors.form)['Days' + i] ? i+1 : '-');

		flNum = airlineCode + this.getFormValues(EditRouteSelectors.form).Number;

		this.click(EditRouteSelectors.PriceReset);

		// generate arrays of outbound and inbound prices
		newOutboundPrices = AdjustPrices([
			this.getFormValues(EditRouteSelectors.form).PriceY1,
			this.getFormValues(EditRouteSelectors.form).PriceC1,
			this.getFormValues(EditRouteSelectors.form).PriceF1 ],
			[ outbound_dep_time, outbound_arr_time]);

		newInboundPrices = AdjustPrices([
			this.getFormValues(EditRouteSelectors.form).PriceY2,
			this.getFormValues(EditRouteSelectors.form).PriceC2,
			this.getFormValues(EditRouteSelectors.form).PriceF2 ],
			[ inbound_dep_time, inbound_arr_time]);

		// tick the "noSlots" checkboxes as required
		casper.then(function() {
			if (this.visible(EditRouteSelectors.noSlots1))
				this.click(EditRouteSelectors.noSlots1);

			if (this.visible(EditRouteSelectors.noSlots2))
				this.click(EditRouteSelectors.noSlots2);
		});

		// submit the new prices
		casper.then(function () {
			this.fill(EditRouteSelectors.form, {
			'PriceY1': newOutboundPrices[0],
			'PriceC1': newOutboundPrices[1],
			'PriceF1': newOutboundPrices[2],

			'PriceY2': newInboundPrices[0],
			'PriceC2': newInboundPrices[1],
			'PriceF2': newInboundPrices[2]
			}, false);

			this.click(EditRouteSelectors.confirm);

			this.waitForText('The route has been updated',
				function found()
				{
					logMessage('OK', '@' + flNum + '@,' + this.getCurrentUrl() + "\t" + base + "-" + destination + "\t" + days + "\tUpdated");
				},

				function timeout()
				{
					logMessage('ERROR', '@' + flNum + '@,' + this.getCurrentUrl() + "\t" + base + "-" + destination + "\t" + days + "\tTimed out waiting for update");
				}

				, 2000
			);
		});
	},

	function timeout()
	{
		logMessage('ERROR', "?\t" + links[i].html + "\t?\tTimeout");
	}

	, 2000);
}
});

casper.then(function() {
logHTML("</tbody>\n</table>\n");
logMessage("INFO", "Complete");
});

casper.run();
