/*
renumber.js
*/

phantom.libraryPath = '/home/delano/js';

phantom.injectJs( './global.js'); 
phantom.injectJs( 'selectors.js'); 
phantom.injectJs( 'retime_core.js'); 
phantom.injectJs( 'schedules.js');

function usage()
{
console.log(argv[0] + requiredArgs.join("\n") + "\n" +
					  "--h\tthis message" + "\n" +
					  "--timetable_id=<timetable_id>\tprovided by local DB" + "\n" +
					  "[--slots]\tpurchase slots" + "\n" +
					  "[--force]\tforce fleet_type change" + "\n");
}


if (casper.cli.has('h') || !casper.cli.has('timetable_id') || parseInt(casper.cli.has('timetable_id') , 10) <= 0)
{
	usage();
	casper.exit(1);
}
var timetable_id = casper.cli.get("timetable_id");
logMessage("INFO", "timetable_id = "+timetable_id);

var getSlots = true;
if (casper.cli.has("no-slots"))
{
	getSlots = false;
	logMessage("INFO", "No slots will be purchased");
}

// destination aircraft
var newAircraft = null;
if (casper.cli.has("to-aircraft"))
{
	newAircraft = casper.cli.get("to-aircraft").toUpperCase();
	logMessage('INFO', 'to-aircraft = ' + newAircraft);
}

var forceFleet = false;
if (casper.cli.has("force"))
{
	forceFleet = true;
	logMessage("INFO", "Fleet type changes will be applied");
}

phantom.injectJs('login.js'); 

// only do login check if all params available

var changeRequests = [];

function getTimetableFlights(timetable, routeCallback, mtxCallback)
{
	var routeData = [];
	var rIndex = -1;
	
	// look for a flight on the required day for each timetable entry
	casper.each(timetable.entries, function (casper, flightData, index) {
		
		// for the maintenance entry, call the maintenance callback
		if (flightData.flight_number == 'MTX')
		{
			var tm = flightData.start_time.split(':');
			mtxCallback({ day: flightData.start_day - 1, hh: tm[0], mm: tm[1] });
		}
		else	// this is a normal flight, so add its details
		{
			casper.then(function() {

			routeData[++rIndex] = { 
				flight_id: -1, 
				flight_number: flightData.flight_number, 
				base_airport_iata: timetable.base_airport_iata, 
				dest_airport_iata:  flightData.dest_airport_iata, 
				day: flightData.start_day,
				assigned: false
			};		
			
			casper.thenOpen(routeSearchFlNumURL + flightData.flight_number);
			
			casper.waitForSelector(ManageRouteSelectors.viewRouteLinks, 
				function found()
				{
					// get the Routes/View url with flight number
					var routes = this.getElementsInfo(ManageRouteSelectors.viewRouteLinks);
					var days = this.getElementsInfo(ManageRouteSelectors.flightDays);
					var bases = this.getElementsInfo(ManageRouteSelectors.base);
					var destinations = this.getElementsInfo(ManageRouteSelectors.destination);
					var assignedAircraft = this.getElementsInfo(ManageRouteSelectors.assignedAircraft);


					// bomb if there is a mismatch between flight data and timetable entry
					// TODO: fleet type check
					if (destinations[0].text != flightData.dest_airport_iata ||
						bases[0].text != timetable.base_airport_iata)
					{
						logMessage('ERROR', "Flight number [" + routes[0].html + "] (" + bases[0].text + "-" + destinations[0].text +") != " + timetable.base_airport_iata + "-" + flightData.dest_airport_iata);
						routeData[rIndex].error = "Timetable base/destination mismatch";

						logMessage('ERROR', 
								routeData[rIndex].flight_number + "\t" +
								routeData[rIndex].base_airport_iata + "-" + routeData[rIndex].dest_airport_iata + "\t" +
								'@' + weekNumberDays[routeData[rIndex].day] + '@,' +
								'#' + "\t" +
								bases[0].text + "-" + destinations[0].text);
						return;
					}
					
					// extract basic route data
					casper.each(routes, function(casper, info, index) {
						var day = days[index].text.replace(/\D+/g, '');

						if (day == flightData.start_day)
						{
							var m = info.attributes.href.match(/game\/Routes\/View\/(\d+)/);
							routeData[rIndex].flight_id = m[1];
							
							if (assignedAircraft[index].attributes.title.indexOf('tooltip_fleet') == -1)
							{
								routeData[rIndex].assigned = true;
							}
							logMessage((routeData[rIndex].assigned ? 'ERROR' : 'OK'), 
									routeData[rIndex].flight_number + "\t" +
									routeData[rIndex].base_airport_iata + "-" + routeData[rIndex].dest_airport_iata + "\t" +
									'@' + weekNumberDays[routeData[rIndex].day] + '@,' +
									routeViewURL + routeData[rIndex].flight_id + "\t" +
									(routeData[rIndex].assigned ? 'Assigned' : 'Available'));								
									
							return;
						}							
					});
					
					casper.then(function() {
						if (routeData[rIndex].flight_id == -1)
						{
							logMessage("INFO", "Missing " + routeData[rIndex].flight_number + " on " + weekNumberDays[routeData[rIndex].day]);
						}
					});
				},

				function timeout()
				{
					logMessage('ERROR', "Flight number ["+flightData.flight_number+"] not found");
					routeData[rIndex].error = "Flight not found";
					
					logMessage('ERROR', 
							routeData[rIndex].flight_number + "\t" +
							routeData[rIndex].base_airport_iata + "-" + routeData[rIndex].dest_airport_iata + "\t" +
							'@' + weekNumberDays[routeData[rIndex].day] + '@,' +
							'#' + "\t" +
							routeData[rIndex].error);
								
					return;
				},

			10000);	
			});	
		}
	});
	
	casper.then(function() {
		logHTML("\n</tbody>\n</table>\n");
		routeCallback(routeData);
	});	
}

// the internal AWS IDs for the aircraft
var acFleetTypeId = null;
var acBaseAirport = null;
var newAircraftData = null;

// verify the destination airplane exists
casper.then(function()
{
	if (newAircraft !== null)
	{
		casper.verifyAircraft(newAircraft, function (data) {
			newAircraftData = data;
			if (newAircraftData.aircraft_id === -1)
			{
				logMessage('ERROR', "Bad aircraft identifier [" + newAircraft + "]");
				casper.exit(1);
			}
			else
			{
				acFleetTypeId = newAircraftData.fleet_type_id;
				acBaseAirport = newAircraftData.base_airport_iata;

				logMessage('OK', "Validated target aircraft " + newAircraft + " (" + newAircraftData.aircraft_id +") at "+acBaseAirport);
			}
		});
	}
});
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
		timetables = JSON.parse(this.getPageContent())['timetables'];
		//console.log(JSON.stringify(timetables, null, 4)); 

		if (timetables[0] === undefined)
		{
			logMessage("ERROR", "No timetable matches timetable_id ["+ timetable_id + "]");
			casper.exit(1);
		}
		timetableData = timetables[0];

		// verify that the timetable and aircraft are the same fleet_type_id
		if (newAircraft !== null)
		{
			if (timetableData.fleet_type_id != acFleetTypeId)
			{
				logMessage('ERROR', "Fleet type mismatch: aircraft [" + newAircraft + "] = " + acFleetTypeId + "; timetable [" + timetableData.timetable_name + "] = " + timetableData.fleet_type_id);
				casper.exit(2);
			}

			// verify that the timetable and aircraft are the same base
			if (timetableData.base_airport_iata != acBaseAirport)
			{
				logMessage('ERROR', "Base airport mismatch: aircraft [" + newAircraft + "] = " + acBaseAirport + "; timetable [" + timetableData.timetable_name + "] = " + timetableData.base_airport_iata);
				casper.exit(2);
			}
		}		
		// find the first non-MTX flight and add it to the timetableDataect
		for (i=0; i < timetableData.entries.length; i++)
		{
			if (timetableData.entries[i].flight_number != 'MTX')
			{
				changeObj = {};
				
				// rewrite flight number with zero padding
				num = timetableData.entries[i].flight_number.substr(2);
				code = timetableData.entries[i].flight_number.substr(0, 2);
				changeObj.flight_number = code + String('0000'+num).slice(-4);
				//changeObj.flight_number = timetableData.entries[i].flight_number;
				changeObj.fleet_type_id = timetableData.fleet_type_id;
				changeObj.new_day = timetableData.entries[i].start_day;
				qz = timetableData.entries[i].start_time.split(':');
				changeObj.new_time = { hh: qz[0], mm: qz[1] };
				
				changeRequests.push(changeObj);
			}
		}
		logMessage('INFO', "[" + timetableData.fleet_type + "] timetable [" + timetableData.timetable_name + "] at "+ timetableData.base_airport_iata +" has "+ changeRequests.length + " flights");
		//console.log(JSON.stringify(changeRequests, null, 4));
	}
);



casper.then(function() {
	var result = casper.retime(changeRequests, getSlots, forceFleet); 
});	

/* create a routes array, where each entry is an timetableDataect thus:
	{ flight_id, flight_number, base, destination, day }
   this is to be passed into assignRoutesToAircraft;
   
   if there is an error for any flight, the flight ID will be -1,
   and an 'error' field will provide details
*/
var routeData = [];
var maintenanceData = { 'day'	: -1, 'hh'	: -1, 'mm'	: -1 };	

casper.then(function() {
	if (newAircraft != null)
	{
		//console.log(JSON.stringify(timetableData, null, 4));

		getTimetableFlights(timetableData, 
		
			function flights(s) 
			{
				//console.log(JSON.stringify(s, null, 4));
				routeData = s;
			},
			
			function mtx(s)
			{
				//console.log(JSON.stringify(s, null, 4));
				maintenanceData = s;
			}
		);
	}
});


// if we have been given a valid destination aircraft, assign routes and maintenance
casper.then(function()
{
	if (newAircraft != null && newAircraftData.aircraft_id !== -1)
	{
		var status = false;
		// assign flights to the target aircraft
		casper.then(function() {
			// now assign maintenance
			//logMessage('DEBUG', "Maintenance: " + [maintenanceData.day, maintenanceData.hh, maintenanceData.mm].join(", "));
			casper.assignMaintenanceToAircraft(newAircraftData, maintenanceData.day, maintenanceData.hh, maintenanceData.mm, function(s) {
				if (s)
				{
					casper.sendFlightsToDB(newFlightDBData);
				}
			});	
		});

		casper.then(function() {
			logHTML("\n</tbody>\n</table>\n");
			casper.assignRoutesToAircraft(routeData, newAircraftData, function(s) {
					status = s;
					if (!status)
					{
						casper.exit(1);
					}
					logMessage('INFO', "Complete");
			});
		});
	}
});
casper.run();