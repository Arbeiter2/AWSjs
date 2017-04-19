/*
renumber.js
*/

phantom.libraryPath = '/home/delano/js';

phantom.injectJs( './global.js'); 
phantom.injectJs( 'selectors.js'); 

function usage()
{
console.log(argv[0] + requiredArgs.join("\n") + "\n" +
					  "--h\tthis message" + "\n" +
					  "--from=<flight-number>[,<flight-number>,...]\tcurrent flight numbers (e.g. AA120)" + "\n" +
					  "--to=<new-flight-number>[,<flight-number>,...]\tnew flight numbers (e.g. AA145)\n" + 
					  "from/to list lengths must match");
}

function hash(e){for(var r=0,i=0;i<e.length;i++)r=(r<<5)-r+e.charCodeAt(i),r&=r;return r};

if (casper.cli.has('h') || !casper.cli.has('from') || !casper.cli.has('to'))
{
	usage();
	casper.exit(1);
}
var oldFlightNumParam = casper.cli.get("from").toUpperCase();
var newFlightNumParam = casper.cli.get("to").toUpperCase();

// reject flight numbers not in the format XX999[,999,999]
var flightNumberRe = /^[a-zA-Z]{2}\d+(,\d+)*$/;
if (oldFlightNumParam.search(flightNumberRe) == -1 || newFlightNumParam.search(flightNumberRe) == -1)
{
	usage();
	casper.exit(1);
}

// strip off the airline code
var oldFlightNumbers = oldFlightNumParam.substr(2).split(",");
var newFlightNumbers = newFlightNumParam.substr(2).split(",");
var airlineCode = oldFlightNumParam.substr(0, 2);

// bomb if list lengths differ
if (oldFlightNumbers.length != newFlightNumbers.length)
{
	usage();
	casper.exit(1);
}

//logMessage('OK', 'from = ' + oldFlightNumbers.join("/"));
//logMessage('OK', 'to = ' + newFlightNumbers.join("/"));

var xp = [];
for (i=0; i < oldFlightNumbers.length; i++)
{
	xp.push(airlineCode + oldFlightNumbers[i] + " -> " + airlineCode + newFlightNumbers[i]);
}
logMessage('OK', 'changes = ' + xp.join(", "));


// only do login check if all params available
phantom.injectJs('login.js'); 

var routeSearchFlNumURL = 'http://www.airwaysim.com/game/Routes/Manage/?Keyword=';
var routeViewURL = 'http://www.airwaysim.com/game/Routes/View/';


var editViewRe = /game\/Routes\/Edit\/(\d+)/;

function getDayString(dayNumber)
{
	return "-".repeat(dayNumber - 1) + dayNumber + "-".repeat(7 - dayNumber);
}

var links = [];
var successful = { old_: [], new_: [] };

casper.then(function() {
	logHTML("<table class='CSSTableGenerator'><thead><tr><td>Status</td><td>Old<br />Flt Num</td><td>New<br />Flt Num</td><td>Days Flown</td></tr></thead>\n<tbody>\n");

	casper.each(oldFlightNumbers, function(casper, oldNum, index) {
	
		this.clear();
		
		var newNum = newFlightNumbers[index];
		
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
					//casper.exit(1);
				},
				
				5000
			);
		});
		
		var days = "-------";
		casper.then(function () {

			casper.each(links, function(casper, editLink, index) {

				// if the route has not been found, then create it
				casper.thenOpen('http://www.airwaysim.com/' + editLink.attributes.href, function() {
				
					var f = editLink.attributes.href.match(editViewRe);
					var flightID = f[1];
					var status = 'OK';

					
					this.waitForSelector(EditRouteSelectors.confirm,

						function found()
						{
							var formData = {};
							
							formData[EditRouteSelectors.flightNumber] = newNum;

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
						logMessage(status, airlineCode + oldNum + "\t" + '@' + airlineCode + newNum + '@,' + 'http://www.airwaysim.com/' + editLink.attributes.href.replace(/Edit/, 'View') + "\t" + days);
						
						// add only unique flight numbers
						if (successful.old_.indexOf(oldNum) == -1)
						{
							successful.old_.push(oldNum);
							successful.new_.push(newNum);
						}
					});
				});
			});
		});
	});
});


casper.then(function() {
	logHTML("\n</tbody>\n</table>\n");
});

casper.then(function() {
	if (successful.old_.length > 0)
	{
		logMessage("INFO", "Updating local DB");
		
		casper.open('http://localhost/aws/renumber.php',
		{
			method: 'post',
			headers: { 'Accept': 'application/json' },
			data: 
			{ 
				game_id: gameID, 
				old_flight_numbers: airlineCode + successful.old_.join(','),
				new_flight_numbers: airlineCode + successful.new_.join(',')
			}
		}).then(function() 
		{ 
			var results = JSON.parse(this.getPageContent());
//			logMessage('DEBUG', JSON.stringify(results, null, 4));

			if (results.status != 'OK')
			{
				logMessage('ERROR', results.error);
			}
			else
			{
				logMessage('INFO', "Updates: [flights] = " + results.rows_affected.flights + "; [timetables] = " + results.rows_affected.timetables);
			}
		});			
	}
});

casper.then(function() {	
	logMessage('INFO', 'Complete');
});
casper.run();