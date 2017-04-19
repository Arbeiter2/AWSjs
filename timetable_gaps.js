phantom.libraryPath = '/home/delano/js';

phantom.injectJs( 'global.js'); 
phantom.injectJs( 'selectors.js');
phantom.injectJs( 'gaps.js'); 

phantom.injectJs( './login.js'); 



function usage()
{
console.log(argv[0] + requiredArgs.join("\n") + "\n" +
					  "--h\tthis message");
}

var RESThost = 'http://localhost/aws/app/v1/';
var timetableData;
casper.thenOpen(RESThost +  'games/' + gameID + '/timetables/all',
    {
        method: 'get',
        headers: {
            'Accept': 'application/json'
        }
    },

    function()
    {
        timetableData = JSON.parse(this.getPageContent());
        logMessage('INFO', "Got details of " + timetableData.timetables.length + " timetables from local DB");
    }
);


// now look for each sample flight in the Manage Routes page
var gapData = [];
casper.then(function() {
	//console.log(JSON.stringify(timetableData.timetables, null, 4));
	this.getTimetableGaps(timetableData, function(result)
	{
		if (result === null)
		{
			logMessage('ERROR', "No good");
			this.exit(1);
		}
		gapData = result;
	});
});

casper.then(function()
{
	logHTML(
		"<table class='standard nowrap sortable'>" +
		"<thead>" +
		"<tr>" +
		"<td rowspan='2'>Status</td>" +
		"<td rowspan='2'>Base</td>" +
		"<td rowspan='2'>Timetable</td>" +
		"<td rowspan='2'>Flight</td>" +
		"<td rowspan='2'>Type</td>" +
		"<td rowspan='2'>Range</td>" +
		"<td rowspan='2'>Requires</td>" +
		"<td colspan='3'>Last a/c</td>" +
		"</tr>" +
		"<tr><td>Reg</td><td>Model</td><td>Range/nm</td></tr>" +
		"</thead>" +
		"<tbody>"
	);
});

// now we get the number of aircraft required
casper.then(function()
{
	if (!silent)
	{
	casper.each(gapData, function (casper, timetableObj, index)
	{
		lastAssigned = timetableObj.lastAssigned;
		lastAircraftDetails = "";
        if (timetableObj.unassignedCount == 7)
        {
            lastAircraftDetails = "\t\t<span class='red'>&lt;None&gt;</span>";
        }
        else
        {
            lastAircraftDetails = timetableObj.days[lastAssigned] +  "\t" +
            aircraftData[timetableObj.days[lastAssigned]].model + "\t" +
            aircraftData[timetableObj.days[lastAssigned]].range;
		}

		logMessage((timetableObj.validFlight ? "OK" : "ERROR"), 
			'@' + timetableObj.base_airport_iata + '@,' + RESThost + 'airports/' + timetableObj.base_airport_iata + ".html\t" + 
			'@' + timetableObj.name + '@,' + RESThost + 'games/' + gameID + '/timetables/' + timetableObj.timetable_id + ".html\t" + 
			'@' + timetableObj.firstFlight + '@,' + RESThost + 'games/' + gameID + '/flights/' + timetableObj.firstFlight + ".html\t" + 
			'@' + timetableObj.fleet_type + '@,' + RESThost + 'fleets/' + timetableObj.fleet_type_id + ".html\t" + 
			timetableObj.max_distance_nm + "\t" + 
			timetableObj.unassignedCount + "\t" + 
			lastAircraftDetails);
	});
	}
	else
	{
		console.log(JSON.stringify(gapData, null, 4));
	}
});

casper.then(function()
{
	logHTML("</tbody>\n</table>\n");
	logMessage('INFO', "Complete");
});

casper.run();
