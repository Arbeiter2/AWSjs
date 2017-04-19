/*
renumber.js
*/

phantom.libraryPath = '/home/delano/js';

phantom.injectJs( './global.js'); 
phantom.injectJs( 'selectors.js'); 
phantom.injectJs('getflightdata.js');


types = {
    'F50' : 37, 
    'B732' : 22, 
    'B733' : 23, 
    'B736' : 24, 
    'A340' : 8, 
    'B757' : 28, 
    'B767' : 29, 
    'B777' : 30,
    'DH8D' : 106,
    'A320' : 7,
    } ; 

function usage()
{
console.log(argv[0] + requiredArgs.join("\n") + "\n" +
					  "--h\tthis message" + "\n" +
					  "--flights=<flight-number>[,<flight-number>,...]\tflight numbers (e.g. AA120)" + "\n" +
					  "--fleet-type=[" + Object.keys(types).join(' | ') + "]\tnew fleet type");
}

function hash(e){for(var r=0,i=0;i<e.length;i++)r=(r<<5)-r+e.charCodeAt(i),r&=r;return r}

function getDayString(dayNumber)
{
	return "-".repeat(dayNumber - 1) + dayNumber + "-".repeat(7 - dayNumber);
}

if (casper.cli.has('h') || !casper.cli.has('flights') || !casper.cli.has('fleet-type'))
{
	usage();
	casper.exit(1);
}
var oldFlightNumParam = casper.cli.get("flights").toUpperCase();

// reject flight numbers not in the format XX999[,999,999]
var flightNumberRe = /^[a-zA-Z]{2}\d+(,\d+)*$/;
if (oldFlightNumParam.search(flightNumberRe) == -1)
{
	usage();
	casper.exit(1);
}

// strip off the airline code
var oldFlightNumbers = oldFlightNumParam.substr(2).split(",");
var airlineCode = oldFlightNumParam.substr(0, 2);

var fleet_type_icao = casper.cli.get("fleet-type").toUpperCase();
if (types[fleet_type_icao] === undefined)
{
	console.log("Unknown fleet type ["+fleet_type_icao+"]");
	usage();
	casper.exit(1);
}
fleet_type_id = "a" + types[fleet_type_icao];


// only do login check if all params available
phantom.injectJs('login.js'); 

var routeSearchFlNumURL = 'http://www.airwaysim.com/game/Routes/Manage/?Keyword=';
var routeViewURL = 'http://www.airwaysim.com/game/Routes/View/';


var editViewRe = /game\/Routes\/Edit\/(\d+)/;


var links = [];
var successful = [];

casper.then(function() {
	logHTML("<table class='CSSTableGenerator'><thead><tr><td>Status</td><td>Old<br />Flt Num</td><td>New<br />Flt Num</td><td>Days Flown</td></tr></thead>\n<tbody>\n");

	casper.each(oldFlightNumbers, function(casper, oldNum, index) {
	
		this.clear();
		
		// check whether the original flights exist
		casper.thenOpen(routeSearchFlNumURL + airlineCode + oldNum, function() {
			//logMessage('DEBUG', this.getCurrentUrl());

			this.waitForSelector(ManageRouteSelectors.editRouteLinks,
				function found()
				{
					links = this.getElementsInfo(ManageRouteSelectors.editRouteLinks);
				},
				
				function timeout()
				{
					logMessage('ERROR', "Flight [" + airlineCode + oldNum + "] not found");
					casper.exit(1);
				},
				
				5000
			);
		});
		
		var days = "-------";
		casper.then(function () {

			casper.each(links, function(casper, editLink, index) {

				casper.thenOpen('http://www.airwaysim.com/' + editLink.attributes.href, function() {
				
					var f = editLink.attributes.href.match(editViewRe);
					var flightID = f[1];
					var status = 'OK';

					
					this.waitForSelector(EditRouteSelectors.confirm,

						function found()
						{
							var formData = {};
							
							formData[EditRouteSelectors.fleetCode] = fleet_type_id;

							days = (this.getFormValues(EditRouteSelectors.form).Days0 ? '1' : '-') +
									   (this.getFormValues(EditRouteSelectors.form).Days1 ? '2' : '-') +
									   (this.getFormValues(EditRouteSelectors.form).Days2 ? '3' : '-') +
									   (this.getFormValues(EditRouteSelectors.form).Days3 ? '4' : '-') +
									   (this.getFormValues(EditRouteSelectors.form).Days4 ? '5' : '-') +
									   (this.getFormValues(EditRouteSelectors.form).Days5 ? '6' : '-') +
									   (this.getFormValues(EditRouteSelectors.form).Days6 ? '7' : '-');
										   
							// keep slots unpurchased
							if (this.exists(EditRouteSelectors.noSlots1))
								formData[EditRouteSelectors.noSlots1] = true;
							if (this.exists(EditRouteSelectors.noSlots2))
								formData[EditRouteSelectors.noSlots2] = true;
								
							//require('utils').dump(formData);
								
							this.fillSelectors(EditRouteSelectors.form,	formData, false);
								
							flightDataObj = this.getFlightData();

							// submit the form
							this.click(EditRouteSelectors.confirm);
							
							// wait for the panel with "Error" or "OK"
							this.waitUntilVisible(EditRouteSelectors.routeSuccessMessage,
								function visible()
								{
									if (this.fetchText(EditRouteSelectors.routeSuccessMessage).indexOf("The route has been updated") == -1)
									{
										status = 'ERROR';
									}
								},
								
								function fail()
								{
									status = 'TIMEOUT';
								},
								
								20000
							);
						},
						
						function timeout()
						{
							status = 'TIMEOUT';
						},
						
						20000
					);
					
					this.then(function() {
						logMessage(status, '@' + airlineCode + oldNum + '@,' + 'http://www.airwaysim.com/' + editLink.attributes.href.replace(/Edit/, 'View') + "\t" + days);
						
						successful.push(flightDataObj);

					});
				});
			});
		});
	});
});



casper.then(function() {
	uri = 'http://localhost/aws/app/v1/games/' + gameID + '/flights/';
	casper.thenOpen(uri,
		{
			method: 'post',
			data: JSON.stringify(successful)
		},
		
		function (response)
		{
			console.log(JSON.stringify(response, null, 4));
		}
	);
	logHTML("\n</tbody>\n</table>\n");
	logMessage('INFO', 'Complete');

});
casper.run();