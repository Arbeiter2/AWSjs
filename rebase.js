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
						  "--aircraft-id=<aircraft-id>\n" +
						  "--to=<-airport-code (3 or 4 char)>");
	casper.exit(1);
}

if (casper.cli.has('h') || !casper.cli.has('aircraft-id') || !casper.cli.has('to'))
{
	usage();
}

var aircraftId = parseInt(casper.cli.get("aircraft-id"));
if (aircraftId <= 0)
{
	usage();
}

var newBase = casper.cli.get("to").toUpperCase();
if (newBase.search(/^[A-Z]{3,4}$/) == -1)
{
	usage();
}

// only do login check if all params available
phantom.injectJs('login.js'); 

var aircraftURL = 'http://www.airwaysim.com/game/Aircraft/My/View/' + aircraftId;
var rebaseLink = '#normalDataButtons > div.flLeft > a.flLeft.aircraftManageIcon12';
var baseSelect = '#dialogRebaseNewbase';
var baseText = x('//select/option[contains(text(), "' + newBase + '")]');

		
// check whether the original flights exist
var success = false;
var error = '';

casper.thenOpen(aircraftURL, function() {
	this.waitForSelector(rebaseLink,
		function found()
		{
			this.thenClick(rebaseLink,
				
				function()
				{
					// base airport
					if (!this.exists(baseText))
					{
						error = "Cannot change base to ["+newBase+"]";
						return;
					}
					
					
					baseValue = this.getElementInfo(baseText);
					//console.log(JSON.stringify(baseValue, null, 4));
					this.evaluate(function(baseID) {
						$('#dialogRebaseNewbase').val(baseID);
					}, baseValue.attributes.value);
					
					this.fillSelectors('#dialogRebase > form', 
					{
						'#dialogRebaseNewbase': baseValue.attributes.value
					}, true);
					
					this.click('#rebaseOKbtn > span');
					
					success = true;
				}
			);
		},
		
		function timeout()
		{
			error =  "Aircraft [" + aircraftId + "] not found";
			//casper.exit(1);
		},
		
		5000
	);
});

casper.then(function()
{
	obj = { 'success' : success, 'error' : error };
	console.log(JSON.stringify(obj, null, 4));
}
);

casper.run();
