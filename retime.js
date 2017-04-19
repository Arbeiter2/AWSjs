/*
renumber.js
*/

phantom.libraryPath = '/home/delano/js';

phantom.injectJs( './global.js'); 
phantom.injectJs( 'selectors.js'); 
phantom.injectJs( 'retime_core.js'); 

function usage()
{
console.log(argv[0] + requiredArgs.join("\n") + "\n" +
					  "--h\tthis message" + "\n" +
					  "[--slots]\tpurchase slots" + "\n" +
					  "--changes=<change1>[.<change2>[,<change3>...]]" + "\n" +
					  "\t<change> = <flight-number>/<new-time>[/<new-day>]\te.g. AA120/06:20 or AA901/12:45/3" + "\n" +
					  "\t<flight-number>\tflight number (e.g. AA120)" + "\n" +
					  "\t<new-day>=1..7\tnew departure day] (applied only when one flight found)\n" +
					  "\t<new-time>=hh:mm\tnew departure time with 5-minute precision (e.g. 06:40)");
}


if (casper.cli.has('h') || !casper.cli.has('changes'))
{
	usage();
	casper.exit(1);
}

var changesParam = casper.cli.get("changes").toUpperCase();
var changes = [];


var getSlots = false;
if (casper.cli.has("slots"))
{
	getSlots = true;
	logMessage("INFO", "Slots will be purchased");
}

var zpq = changesParam.split(/,/);
if (zpq.length == 0)
{
	usage();
	casper.exit(2);
}

// validate change requests
casper.each(zpq, function(casper, str, index) 
{
	re = /^(\w{2})(\d+)\/(\d{2}):(\d{2})(\/[1-7]){0,1}$/gi;
	m1 = re.exec(str);
	/*
	m[0] = matched string
	m[1] = airline code
	m[2] = flight number (numeric only)
	m[3] = hh24
	m[4] = mm
	m[5] = /day
	*/

	if (m1 == null)
	{
		logMessage('ERROR', "Bad change format ["+str+"]");
		usage();
		casper.exit(2);
	}

	// time
	if (parseInt(m1[3], 10) > 23 || parseInt(m1[4], 10) > 55 || parseInt(m1[4], 10) % 5 !== 0)
	{
		logMessage('ERROR', "Bad change format ["+str+"]");
		usage();
		casper.exit(2);
	}

	changeObj = {};
	changeObj.flight_number = m1[1].toUpperCase() + m1[2];
	changeObj.new_time = { hh: m1[3], mm: m1[4] };

	// new day
	if (m1[5] !== undefined)
	{
		changeObj.new_day = m1[5].replace(/\D+/, '');
	}

	changes.push(changeObj);
});

chgTxt = [];
for (i=0; i < changes.length; i++)
{
	chgTxt.push(changes[i].flight_number + " -> " + changes[i].new_time.hh + ":" + changes[i].new_time.mm + (changes[i].new_day !== undefined ? "/" + changes[i].new_day : ""));
}
logMessage('OK', 'changes = '+chgTxt.join(", "));

// only do login check if all params available
phantom.injectJs('login.js'); 

casper.then(function() {
	var result = casper.retime(changes, getSlots); 
});	

casper.run();