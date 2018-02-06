/*
swap.js
*/
phantom.libraryPath = '/home/delano/js';

phantom.injectJs( './global.js'); 
phantom.injectJs( 'selectors.js'); 
phantom.injectJs( 'schedules.js');

function usage()
{
console.log(argv[0] + requiredArgs.join("n") + "n" +
					  "--htthis message" + "n" +
					  "--from-aircraft=<registration>tsource aircraft registration" + "n" +
					  "--to-aircraft=<registration>tdestination aircraft registration");
}


if (casper.cli.has('h') || !casper.cli.has('from-aircraft') || !casper.cli.has('to-aircraft'))
{
	usage();
	casper.exit(1);
}
var srcAircraft = casper.cli.get("from-aircraft").toUpperCase();
logMessage('OK', 'from-aircraft = ' + srcAircraft);

// destination aircraft
var newAircraft = casper.cli.get("to-aircraft").toUpperCase();
logMessage('OK', 'to-aircraft = ' + newAircraft);

// only do login check if aircraft param is available
phantom.injectJs( './login.js'); 

// use the manage routes page with the specific aircraft name
casper.then(function () 
{
	this.swapSchedules(srcAircraft, newAircraft);
});

casper.run();