phantom.libraryPath = '/home/delano/js';

phantom.injectJs( 'global.js'); 
phantom.injectJs( 'selectors.js');
phantom.injectJs( './login.js'); 

function usage()
{
console.log(argv[0] + requiredArgs.join("\n") + "\n" +
					  "--h\tthis message" + "\n" +
					  "--aircraft=<aircraft-reg>");
}


function DayNameToNumber(dd)
{
	switch(dd)
	{
		case 'Mo': return 1; 
		case 'Tu': return 2; 
		case 'We': return 3; 
		case 'Th': return 4; 
		case 'Fr': return 5;
		case 'Sa': return 6;
		case 'Su': return 7;
		default: return -1;
	}
}

function HHMMToMinutes(hhmm)
{
	var z = hhmm.split(':');
	return ~~(z[0]) * 60 + ~~(z[1]);
}

function MinutesToHHMM(minutes)
{
	return ("0" + ~~(minutes / 60)).slice(-2) + ':' +  ("0" + (minutes % 60)).slice (-2);
}

function TimeDiff(a, b)
{
	var a_minutes = HHMMToMinutes(a);
	var b_minutes = HHMMToMinutes(b);
	if (b < a)
		b_minutes += 24 * 60;
	return MinutesToHHMM(b_minutes - a_minutes);
}

function TimeDiffMod(a, b)
{
	var a_minutes = HHMMToMinutes(a);
	var b_minutes = HHMMToMinutes(b);
	if (b < a)
		b_minutes += 24 * 60;
	return MinutesToHHMM(Math.abs(b_minutes - a_minutes));	
}

if (casper.cli.has('h') || !casper.cli.has('aircraft'))
{
	usage();
	casper.exit(1);
}
var aircraftParam = casper.cli.get("aircraft").toUpperCase().trim();

//casper.viewportSize = {width: 1024, height: 768};

var host = 'http://www.airwaysim.com';
var flightNumber;
var postDataObj = {};
postDataObj.game_id	= gameID;


// we create a JSON string containing all the flight details to be added
var flightData = {};

// two-letter airline code
var airlineCode = null;

var aircraft = [];
var aircraftFlightMap = {};
var pageNr = 0;
var links = [];
var a_reg = [];

casper.thenOpen('http://www.airwaysim.com/game/Aircraft/My?Keyword=' + aircraftParam,

				
function processLinks()
{
	pageNr++;


	this.waitForSelector(ViewAircraftSelectors.aircraft_reg, 
		function()
		{
			var acIDs = this.getElementsInfo(ViewAircraftSelectors.boozer);
			//console.log(JSON.stringify(acIDs));
			var dataRows = [];
			
			var regList = this.getElementsInfo(ViewAircraftSelectors.aircraft_reg);
			for (xc=0; xc < regList.length; xc++)
				a_reg.push(regList[xc].text);
			
			for(var index=0; index < acIDs.length; index++) 
			{
				dataRows[index] = acIDs[index].attributes.id.replace('Model', 
					'http://www.airwaysim.com/game/Routes/Schedules/?filterAircraft=');
			}
	logMessage('DEBUG', "Got " + dataRows.length + " aircraft on page " + pageNr);
			
			links.push.apply( links, dataRows );			
		}
	);
	//console.log('Processing page ' + pageNr);


	

	// traverse all pages
	if (this.exists(ViewAircraftSelectors.pageSelector))
	{
		// find number of select options = number of pages
		var f = this.evaluate(function(sel) {
			return document.querySelector('#aircraftForm > div.Small.alRight > select').length;
		});
		
		// selected page number is highlighted in footer
		var pNr = this.getElementInfo(ViewAircraftSelectors.currentPage).text.trim();
		if (pNr < f)
		{
			this.thenClick(ViewAircraftSelectors.nextPage, function() {
				casper.waitForSelectorTextChange(ViewAircraftSelectors.currentPage, function() {
						casper.then(processLinks);
				});
			});
		}
	}
});

casper.then(function() {

//console.log(JSON.stringify(links));
//console.log(JSON.stringify(a_reg));



casper.each(links, function(casper, schedule_link, index) {
casper.thenOpen(schedule_link);
//console.log(JSON.stringify(schedule_link));

casper.waitForSelector('[id^="tooltip"]' + ScheduleSelectors.tooltip_flight_number, //ScheduleSelectors.timetableEntry, 
//casper.waitForSelector(ScheduleSelectors.timetableEntry, 

function found()
{
	
	//console.log(this.getCurrentUrl());
	//this.capture('c:/tmp/' + a_reg[index] + '.jpg');
	
	logMessage('INFO', a_reg[index]);
	
	ft = this.getElementInfo(ScheduleSelectors.addFlightsBtn).attributes.onclick.match(/addFlights\((\d+)/);
	postDataObj.fleet_type_id = ft[1];

	postDataObj.timetable_name = a_reg[index];
	
	// grab fleet_model_id
	var changeRegLink = this.getElementInfo(ScheduleSelectors.tooltip_changeReg);
	var zq = changeRegLink.attributes.onclick.match(/setRegistration\(\d+,(\d+),/);
	postDataObj.fleet_model_id = zq[1];
	
	
	// grab base IATA code
	baseLinks = this.getElementsInfo(MenuSelectors.baseLinks);
	if (baseLinks.length > 1 || this.exists("#tooltip_baselist"))
	{
		postDataObj.base_airport_iata = (this.fetchText(ScheduleSelectors.baseAirport).split(': '))[1].trim();
	}
	else
	{
		postDataObj.base_airport_iata = baseLinks[0].text;
	}

	var events = this.getElementsInfo(ScheduleSelectors.timetableEntry);
	var ttEntries = [];
	
	for (i=0; i < events.length; i++)
	{
		ttEntries[i] = { };
		var tooltipID = '#' + events[i].attributes.title;
		var flight_number, start, earliest, gap;
		
		// if event is a flight, use the flight selectors
		if (tooltipID.indexOf('flt') != -1)
		{
			ttEntries[i].flight_number = (this.getHTML(tooltipID + ScheduleSelectors.tooltip_flight_number).split(' '))[0];
			var z = this.getHTML(tooltipID + ScheduleSelectors.tooltip_earliest_dep).match(/Duration: (\d{2}:\d{2})/m);

			ttEntries[i].start_time = z[1];
			z = this.getHTML(tooltipID + ScheduleSelectors.tooltip_earliest_dep).match(/Earliest possible next departure:\s+(\d{2}:\d{2})/m);
			ttEntries[i].earliest_available = z[1];
			
			ttEntries[i].start_day = (this.getHTML(tooltipID + ScheduleSelectors.tooltip_start_day).split(':'))[1].trim().replace(/\D+/g, '');

			ttEntries[i].dest_airport_iata = this.getHTML(tooltipID + ScheduleSelectors.tooltip_dest);
			ttEntries[i].dest_turnaround_padding = "00:00";
		}
		else
		{
			ttEntries[i].flight_number = ttEntries[i].dest_airport_iata = 'MTX';
			var zr = this.getHTML(tooltipID + ScheduleSelectors.tooltip_chkA_time).match(/(\w{2}) (\d{2}:\d{2}) - \w{2} (\d{2}:\d{2})/m);
			
			ttEntries[i].start_time = zr[2];
			ttEntries[i].start_day = DayNameToNumber(zr[1]);
			ttEntries[i].earliest_available = zr[3];
			ttEntries[i].dest_turnaround_padding = "00:00";
		}
		
		// find the post padding gap of the previous event
		if (i > 0)
		{
			ttEntries[i-1].post_padding =  TimeDiff(ttEntries[i-1].earliest_available, ttEntries[i].start_time);

			if (i == events.length - 1)
			{
				ttEntries[i].post_padding =  TimeDiff(ttEntries[i].earliest_available, ttEntries[0].start_time);
			}
		}
	}
//require('utils').dump(ttEntries);
	
	// find the smallest padding time; this becomes the turnaround time at base
	var minGap = "99:99";
	for (i=0; i < ttEntries.length; i++)
	{
		//if (ttEntries[i].post_padding == '00:00')
		//	continue;
		
		if ((ttEntries[i].flight_number != 'MTX' && (i < ttEntries.length - 1 && ttEntries[i+1].flight_number != 'MTX')) && ttEntries[i].post_padding < minGap)
		{
			//console.log("flight_number = "+ttEntries[i].flight_number+"; old minGap = "+minGap+"; new minGap = "+ttEntries[i].post_padding);
			minGap = ttEntries[i].post_padding;
		}
	}
	
	if (minGap == '99:99')
		minGap = '00:00';
	
	// reduce all the padding times by the size of the turnaround
	for (i=0; i < ttEntries.length; i++)
	{
		if (ttEntries[i].post_padding >= minGap)
		{
			ttEntries[i].post_padding = TimeDiffMod(minGap, ttEntries[i].post_padding);
		}
		
		//logMessage("INFO", ttEntries[i].flight_number + "\t" + ttEntries[i].start_time + "\t" + ttEntries[i].post_padding);
	}
	
	postDataObj.base_turnaround_delta = minGap;
	postDataObj.entries = ttEntries;

console.log(JSON.stringify(postDataObj, null, 4));
},
	
function timeout()
{
	logMessage('ERROR', "No such aircraft found");
	this.exit(1);
},
	
	10000
);

// send the data to the db via web post
casper.then (function() 
{
/*	casper.open('http://localhost/aws/timetable/add_timetable.php',
	{
		method: 'post',
		data: postDataObj
	});
*/
//console.log(JSON.stringify(postDataObj, null, 4));	
	//logMessage("INFO", aircraft_reg + ": Sent " + ttEntries.length + " items to database");
});
});
});

casper.run();
