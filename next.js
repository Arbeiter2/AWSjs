/*
next.js
*/
phantom.libraryPath = '/home/delano/js';

phantom.injectJs( './global.js'); 
phantom.injectJs( 'selectors.js'); 
phantom.injectJs( 'schedules.js');

function usage()
{
console.log(argv[0] + requiredArgs.join("\n") + "\n" +
					  "--h\tthis message" + "\n" +
					  "--from-aircraft=<registration>\tsource aircraft registration" + "\n" +
					  "[--to-aircraft=<registration>]\tdestination aircraft registration" + "\n" +
					  "[--slots]\t(optional) buys slots automatically; default is noSlots");
}


if (casper.cli.has('h') || !casper.cli.has('from-aircraft') || !casper.cli.has('to-aircraft'))
{
	usage();
	casper.exit(1);
}
var srcAircraft = casper.cli.get("from-aircraft").toUpperCase();
logMessage('OK', 'from-aircraft = ' + srcAircraft);

// destination aircraft
var newAircraft = casper.cli.get("to-aircraft").toUpperCase().split(",");
logMessage('OK', 'to-aircraft = ' + newAircraft);

// only do login check if aircraft param is available
phantom.injectJs( './login.js'); 

// default is to create routes with no slots
var noSlots = true;
if (casper.cli.has('slots'))
{
	noSlots = false;
}
logMessage('INFO', 'airport slots will' + (noSlots ? ' not' : '') + ' be purchased');


// use the manage routes page with the specific aircraft name
casper.each(newAircraft, function (self, dest) {
	casper.then(function () 
	{
		__addNextDay(srcAircraft, noSlots, dest);
	});
	
	casper.then(function() {
		srcAircraft = dest;
	});
});

casper.run();
