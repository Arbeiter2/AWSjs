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
					  "--timetable_id=<timetable_id>\tprovided by local DB" + "\n" +
					  "[--slots]\tpurchase slots" + "\n");
}


if (casper.cli.has('h') || !casper.cli.has('timetable_id') || parseInt(casper.cli.has('timetable_id') , 10) <= 0)
{
	usage();
	casper.exit(1);
}
var timetable_id = casper.cli.get("timetable_id");

var getSlots = false;
if (casper.cli.has("slots"))
{
	getSlots = true;
	logMessage("INFO", "Slots will be purchased");
}
logMessage("INFO", "timtable_id = "+timetable_id);

phantom.injectJs('login.js'); 

// only do login check if all params available

var changeRequests = [];

casper.thenOpen('http://localhost/aws/app/v1/games/' + gameID + '/timetables/' + timetable_id, 
	{
		method: 'get',
		//data:   postDataObj,
		headers: {
			'Accept': 'application/json'
		}
	},
	
	function()
	{
		timetableData = JSON.parse(this.getPageContent())['timetables'];
		//console.log(JSON.stringify(timetableData, null, 4)); 

		if (timetableData[0] === undefined)
		{
			logMessage("ERROR", "No timetable matches timetable_id ["+ timetable_id + "]");
			casper.exit(1);
		}
		obj = timetableData[0];
		
		// find the first non-MTX flight and add it to the object
		for (i=0; i < obj.entries.length; i++)
		{
			if (obj.entries[i].flight_number != 'MTX')
			{
				changeObj = {};
				
				// rewrite flight number with zero padding
				num = obj.entries[i].flight_number.substr(2);
				code = obj.entries[i].flight_number.substr(0, 2);
				changeObj.flight_number = code + String('0000'+num).slice(-4);
				//changeObj.flight_number = obj.entries[i].flight_number;
				changeObj.fleet_type_id = timetableData[0].fleet_type_id;
				changeObj.new_day = obj.entries[i].start_day;
				qz = obj.entries[i].start_time.split(':');
				changeObj.new_time = { hh: qz[0], mm: qz[1] };
				
				changeRequests.push(changeObj);
			}
		}
		logMessage('INFO', "[" + timetableData[0].fleet_type + "] timetable [" + timetableData[0].timetable_name + "] at "+ timetableData[0].base_airport_iata +" has "+ changeRequests.length + " flights");
		//console.log(JSON.stringify(changeRequests, null, 4));
	}
);



casper.then(function() {
	var result = casper.retime(changeRequests, getSlots); 
});	

casper.run();