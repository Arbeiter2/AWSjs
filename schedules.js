/*
schedules.js
*/
phantom.injectJs( 'getflightdata.js' );

var scheduleAircraftIDURL = 'http://www.airwaysim.com/game/Routes/Schedules/?filterAircraft=';
var aircraftSearchNameURL = 'http://www.airwaysim.com/game/Aircraft/My?Keyword=';
var aircraftViewURL = 'http://www.airwaysim.com/game/Aircraft/My/View/';
var routeSearchAircraftIDURL = 'http://www.airwaysim.com/game/Routes/Manage/?filterAircraft=';
var routeSearchFlNumURL = 'http://www.airwaysim.com/game/Routes/Manage/?Keyword=';
var routeViewURL = 'http://www.airwaysim.com/game/Routes/View/';
var routeEditURL = 'http://www.airwaysim.com/game/Routes/Edit/';

// the CopyIDNext operation does not validate the airport codes, only route ID
var copyNextURL = 'http://www.airwaysim.com/game/Routes/Open/SPIM/EGLL/?CopyIDNext=';

var routeViewRe = /game\/Routes\/View\/(\d+)/;

// create a map of aircraft registrations for use in user messages
var aircraftNames = {};

// the internal AWS IDs for the aircraft
var parentAircraftData = null;
var newAircraftData = null;

function getDayString(dayNumber)
{
	return "-".repeat(dayNumber - 1) + dayNumber + "-".repeat(7 - dayNumber);
}

var newFlightDBData = {};
var newAircraftDBData = [];

/*
	@return aircraftID on success, null on failure
*/
casper.verifyAircraft = function(identifier, callback)
{
	// if the input values are numeric, verify them and get the corresponding registrations
	if (identifier.match(/^\d+$/) !== null)
	{
		casper.addAircraftName(identifier, function(success) {
			if (!success)
			{
				logMessage('ERROR', "Aircraft ID [" + identifier + "] not found");
				callback(null);
			}
			else
			{
				callback(identifier);
			}
		});
	}
	else
	{
		// find the ID matching this registration
		casper.getAircraftID(identifier, function (data) {
			callback(data);
		});
	}
};


casper.getAircraftBase = function(aircraft_id, callback)
{
/*	
	// visit scheduling page to check where it is based
	this.thenOpen(scheduleAircraftIDURL + aircraft_id, function() {
		casper.waitForSelector(ScheduleSelectors.addFlightsBtn, 
		function found()
		{
			// if this ia a valid aircraftID, there will be only one result found here
			var base_airport = (this.fetchText(ScheduleSelectors.baseAirport).split(': '))[1].trim();
			callback(base_airport);			
		},
		
		function timeout()
		{
			logMessage('ERROR', "getAircraftBase(): Timeout waiting for scheduling page " + this.getCurrentUrl());
			callback(null);
		},
		
		5000);
	});	
*/
	// if we have more than one base_airport_iata link in the menu, get the base_airport_iata IATA codes
	var baseLinks = this.getElementsInfo(MenuSelectors.baseLinks);
	if (baseLinks.length > 1 || this.exists("#tooltip_baselist"))
	{
		this.thenOpen(scheduleAircraftIDURL + aircraft_id, function() {
			casper.waitForSelector(ScheduleSelectors.addFlightsBtn, 
			function found()
			{
				// if this ia a valid aircraftID, there will be only one result found here
				var base_airport = (this.fetchText(ScheduleSelectors.baseAirport).split(': '))[1].trim();
				callback(base_airport);			
			},
			
			function timeout()
			{
				logMessage('ERROR', "getAircraftBase(): Timeout waiting for scheduling page " + this.getCurrentUrl());
				callback(null);
			},
			
			5000);
		});	
	}
	else
	{
		callback(baseLinks[0].text);
	}
};


/*
	getAircraftID
	
	@param registration aircraft tail number
	@param callback callback function for returning aircraftID
	@return numeric value of aircraftID; -1 on failure
*/
casper.getAircraftID = function(registration, callback)
{
	var links = [];
	var retVal = { aircraft_id : -1, aircraft_reg: registration };
	
	casper.thenOpen(aircraftSearchNameURL + registration, function() {
		casper.waitForSelector(ViewAircraftSelectors.viewACSchedule, 
			function found() 
			{
				//links = this.getElementsInfo(ViewAircraftSelectors.viewACSchedule);
				v = this.getElementsInfo('td.Bg.alCenter.scheduleReg.RegNum > a');
				
				for (i=0; i < v.length; i++)
					if (v[i].text == registration)
					{
						links[0] = v[i].attributes.id.replace(/currReg/, '');
					}

				if (links.length === 0)
				{
					logMessage('ERROR', "No aircraft match string [" + registration + "]\n" + this.getCurrentUrl());
					callback(retVal);
				}
				else
				{
					// links[0] now contains the URL with the ID
					//retVal.aircraft_id = (links[0].attributes.href.match(/game\/Routes\/Schedules\/\?filterAircraft=(\d+)/))[1];
					retVal.aircraft_id = links[0];
					
					// add to map of registrations
					aircraftNames[retVal.aircraft_id] = registration;
					
					// unused
					//var fleet_model_id = this.fetchText("#Model" + aircraft_id);

					//casper.thenOpen('http://www.airwaysim.com' + links[0].attributes.href, function() {
					casper.thenOpen(scheduleAircraftIDURL + retVal.aircraft_id, function() {
						
						this.waitForSelector(ScheduleSelectors.ac_tooltip, function() {
						
							// fleet_type_id
							retVal.fleet_type_id = ((this.getElementsInfo('a[title="Add route to schedule"]'))[0].attributes.onclick.match(/\((\d+), /))[1];
							
							// fleet_model_id
							retVal.fleet_model_id = this.getElementInfo('div[id^=BaseID' + retVal.aircraft_id + '] + div[id^=modelName]').attributes.id.replace('modelName', '');
							
							// seats
							xg = this.fetchText(ScheduleSelectors.ac_tooltip);
//console.log(xg);
							re1 = /Seat config: Y(\d+), C(\d+), F(\d+)/gim;
							mxr = re1.exec(xg);
//console.log(JSON.stringify(mxr, null, 4));
							retVal.seats_Y = mxr[1];
							retVal.seats_C = mxr[2];
							retVal.seats_F = mxr[3];

							// range
							re2 = /Nominal range: (\d+) nm/gmi;
							
							mxd = re2.exec(xg);
							retVal.range_nm = mxd[1];

							// base_airport_iata
							// if we have more than one base link in the menu, get the base IATA codes
							var baseLinks = this.getElementsInfo(MenuSelectors.baseLinks);
							if (baseLinks.length > 1 || this.exists("#tooltip_baselist"))
							{
								retVal.base_airport_iata = (this.fetchText(ScheduleSelectors.baseAirport).split(': '))[1].trim();
							}
							else
							{
								retVal.base_airport_iata = baseLinks[0].text;
							}
							callback(retVal);
//console.log(JSON.stringify(retVal, null, 4));
						},
						
						function timeout()
						{
							console.log("Wretched bastard thing! - timeout waiting for schedules page");
						},
						
						3000);
					});
				}
			},
			
			function timeout()
			{
				logMessage('ERROR', "getAircraftID(): No aircraft match string [" + registration + "] " + this.getCurrentUrl());
				callback(retVal);
			},
			
			5000);
	});
};


/*
	@param aircraftID AWS ID of aircraft
	@return true if present or just added, false if aircraftID not valid
*/
casper.addAircraftName = function(aircraftID, callback)
{
	// every aircraft has a scheduling page available
	if (typeof aircraftNames[aircraftID] === "undefined")
	{
		this.thenOpen(scheduleAircraftIDURL + aircraftID, function() {
			casper.waitForSelector(ScheduleSelectors.maintenanceText, 
			function found()
			{
				// if this ia a valid aircraftID, there will be only one result found here
				var links = this.getElementsInfo(ScheduleSelectors.registrationLink);
				if (links.length === 1)
				{
					aircraftNames[aircraftID] = links[0].text;	// text of link
					callback(true);
				}
			},
			
			function timeout()
			{
				logMessage('ERROR', "addAircraftName(): Timeout waiting for scheduling page " + this.getCurrentUrl());
				callback(false);
			},
			
			5000);
		});
	}
	else
	{
		callback(true);
	}
};

/*
	getRouteData
	
	@param aircraftID AWS internal numeric ID of aircraft
	@param callback callback function for returning results as callback(retVal)
	@return array of object { flight_id, flight_number, base, destination, day } of flights on this aircraft
*/
casper.getRouteData = function(aircraftID, callback)
{
	var retRoutes = [];
	
	casper.thenOpen(routeSearchAircraftIDURL + aircraftID, function() {
		casper.waitForSelector(ManageRouteSelectors.viewRouteLinks, 
		
		function found()
		{
 			// get the Routes/View url with flight number
			var routes = this.getElementsInfo(ManageRouteSelectors.viewRouteLinks);
			var days = this.getElementsInfo(ManageRouteSelectors.flightDays);
			var bases = this.getElementsInfo(ManageRouteSelectors.base);
			var outboundTimes = this.getElementsInfo(ManageRouteSelectors.outboundTimes);
			var destinations = this.getElementsInfo(ManageRouteSelectors.destination);
			
			if (routes.length === 0)
			{
				logMessage('ERROR', "getRouteData(): No routes found for aircraft " + aircraftNames[aircraftID]);
				callback(retRoutes);
			}

			// extract basic route data
			casper.each(routes, function(casper, info, index) {
				retRoutes[index] = {};
				var m = info.attributes.href.match(/game\/Routes\/View\/(\d+)/);
			
				retRoutes[index].flight_id = m[1];
				retRoutes[index].flight_number = info.html;
				retRoutes[index].base_airport_iata = bases[index].text;
				retRoutes[index].dest_airport_iata = destinations[index].text;
				retRoutes[index].outbound_dep_time = outboundTimes[index].text.split('-')[0].trim().replace(/(\d{2})(\d{2})/, '$1:$2');
				retRoutes[index].day = days[index].text.replace(/\D+/g, '');
			});
			
			callback(retRoutes);
		},

		function timeout()
		{
			logMessage('ERROR', "getRouteData(): Timeout waiting for routes page at " + this.getCurrentUrl() );
			callback(retRoutes);
		},

		15000);			
	});	
};



/*
	findRouteForNextDay
	
	@param routeData object { flight_id, flight_number, day } containing route data
	@param noSlots if false, buy slots on route if required
	@param callback callback function for returning results as callback(retVal)
	@return object { flight_id, flight_number, day } of next-day flight
*/
casper.findRouteForNextDay = function(routeData, noSlots, callback)
{
	var newDay = (parseInt(routeData.day) + 1 == 8 ? 1 : parseInt(routeData.day) + 1);
	
	var nextDayRoute = { 
		'flight_id' : -1,
		'flight_number' : routeData.flight_number,
		'base_airport_iata' : routeData.base_airport_iata,
		'dest_airport_iata' : routeData.dest_airport_iata,
		'assigned' : false,
		'day': newDay,
	};
	
	casper.thenOpen(routeSearchFlNumURL + routeData.flight_number, function () {
		casper.waitForSelector(ManageRouteSelectors.viewRouteLinks, 
	
		function loaded() 
		{
			// get the Routes/View url with flight number
			var routes = this.getElementsInfo(ManageRouteSelectors.viewRouteLinks);
			var days = this.getElementsInfo(ManageRouteSelectors.flightDays);
			var assignedAircraft = this.getElementsInfo(ManageRouteSelectors.assignedAircraft);
			
			// determine which of the flights is for the next day
			casper.each(days, function(casper, dayInfo, index2) {
				var testDay = dayInfo.text.replace(/\D+/g, '');
				var chgVal = 0;
				if (testDay == newDay)
				{
					var m = routes[index2].attributes.href.match(/game\/Routes\/View\/(\d+)/);
					nextDayRoute.flight_id = m[1];					// the ID of the new (next day) flight

					// now check whether the route has an aircraft assigned to it
					//logMessage('DEBUG', "Found " + routeData.flight_number + " on " + newDay + "; " + assignedAircraft[index2].attributes.href);
					//require('utils').dump(assignedAircraft[index2]);
					if (assignedAircraft[index2].attributes.title.indexOf('tooltip_fleet') == -1)
					//{
						//logMessage('INFO', "findRouteForNextDay() : Next day flight for " + routeData.flight_number + " on " + routeData.day + " already has aircraft assigned " + '@test text@,http://www.airwaysim.com' + routes[index2].attributes.href);
						nextDayRoute.assigned = true;
						//callback(nextDayRoute);
					//}
					//else
					//{
						this.thenOpen(routeEditURL + nextDayRoute.flight_id, function() {
							
							casper.waitForSelector(EditRouteSelectors.confirm, 
							
								function found()
								{
									// grab fleet type, times etc for the candidate flight 
									cp = this.getFlightData();
									//console.log(JSON.stringify(cp, null, 4));
									
									//cp.flight_number = routeData.flight_number;
									//cp.fleet_type_id = parentAircraftData.fleet_type_id;
									cp.flight_model_id = parentAircraftData.fleet_model_id;
									cp.aircraft_reg = newAircraftData.aircraft_reg;

//console.log(JSON.stringify(routeData, null, 4));
								
									newFlightDBData["fl_" + cp.flight_id] = cp;

									// change fleet type and turnaround if required
									//console.log(routeData.flight_number+" flt: ["+cp.fleet_type_id+"] == ["+parentAircraftData.fleet_type_id+"]");
									if (cp.fleet_type_id != parentAircraftData.fleet_type_id)
									{
										//logMessage('DEBUG', "Changed fleet_type of "+routeData.flight_number+" "+cp.fleet_type_id+" -> "+parentAircraftData.fleet_type_id);
										cp.fleet_type_id = parentAircraftData.fleet_type_id;
										this.then(function() {
											this.evaluate(function(FleetID, Turn1) {
												$('#FleetID').val(FleetID).change();
												$('#Turn1').val(Turn1).change();
											}, 'a' + parentAircraftData.fleet_type_id, routeData.turnaround_length);
											this.capture("c:/tmp/trash-q.png");
											chgVal++;
										});										
									}

									// change outbound time if required
									//console.log(routeData.flight_number+" dep: ["+cp.outbound_dep_time+"] == ["+routeData.outbound_dep_time+"]");
									if (cp.outbound_dep_time !== routeData.outbound_dep_time)
									{
										//logMessage('DEBUG', "Changed time of "+routeData.flight_number+" "+cp.outbound_dep_time+" -> "+routeData.outbound_dep_time );
										cp.outbound_dep_time = routeData.outbound_dep_time;

										var outbound_dep_HH = cp.outbound_dep_time.split(':')[0];
										var outbound_dep_MM = cp.outbound_dep_time.split(':')[1];

										this.then(function() {
											this.evaluate(function(HH, MM) {
												$('#Dep1H').val(HH).change();
												$('#Dep1M').val(MM).change();
											}, outbound_dep_HH, outbound_dep_MM);
											this.capture("c:/tmp/trash-z.png");
											chgVal++;
										});
									}

									// if either time or fleet type have been changed, the flight will need to be rescheduled,
									// so will no longer be assigned to an aircraft
									this.then(function()
									{
										if (chgVal > 0)
											nextDayRoute.assigned = false;
									});

									// tick the "noSlots" checkboxes as required
									if (noSlots && this.visible(EditRouteSelectors.noSlots1))
									{
										this.thenClick(EditRouteSelectors.noSlots1);
										this.thenClick(EditRouteSelectors.noSlots2);
										//logMessage("Ignoring slots for "+routeData.flight_number);
										chgVal++;
									}
									
									this.thenClick(EditRouteSelectors.confirm, 
										function() {
											this.waitForText('The route has been updated',

												function success() 
												{
													//logMessage('DEBUG', "No errors with slot allocation");
												},

												function timeout() 
												{
													nextDayRoute.error = this.fetchText(EditRouteSelectors.confirm);
												},
												
											3000);
									});
								},
								
								function timeout()
								{
								},
								
								10000
							);
						});
					//logMessage('OK', routeData.flight_number + " is available for schedule on " + weekNumberDays[newDay] + ' http://www.airwaysim.com' + routes[index2].attributes.href);
						callback(nextDayRoute);
					//}
				}
				
				casper.then(function() {
					callback(nextDayRoute);
				});
			});
		},
		
		function timeout()
		{
			logMessage('ERROR', "findRouteForNextDay(): Timeout waiting for routes page at " + this.getCurrentUrl() );
			callback(nextDayRoute);
		},
		
		15000);
	});
};


/*
	createNextDay
	
	@param routeData object { flight_id, flight_number, day } containing data for the source route
	@param noSlots if true, buy no slots on creation
	@param callback callback function for returning results
	@return object { flight_id, flight_number, base_airport_iata, destination, day } of new flight
*/
casper.createNextDay = function(routeData, noSlots, callback)
{
	var newRoute = {
		'flight_number' : routeData.flight_number, 
		'base_airport_iata' : routeData.base_airport_iata,
		'dest_airport_iata' : routeData.dest_airport_iata,
		'assigned' : false,
		'flight_id' : -1, 
		'day' : (parseInt(routeData.day) + 1 == 8 ? 1 : parseInt(routeData.day) + 1)
	};
	var days = "";
	var validCopy = false;
	newFlightData = {};
	
	this.thenOpen(copyNextURL + routeData.flight_id, function() {
		casper.waitForSelector(EditRouteSelectors.confirm, 
		
		function loaded() 
		{
			var newNumber = this.getFormValues(EditRouteSelectors.form).Number;
			
			// build string showing operating days of flight
			var newDay = null;
			for (var i=0; i < 7; i++)
			{
				days = days + (this.getFormValues(EditRouteSelectors.form)['Days' + i] ? i+1 : '-');
				if (newDay === null && this.getFormValues(EditRouteSelectors.form)['Days' + i])
				{
					newDay = i + 1;		// used for route checking later
				}
			}
			
			// check whether the new flight number is the same as that of the parent flight
			var parentFlightNum = routeData.flight_number.replace(/^../, '');
			
			if (parentFlightNum != newNumber)
			{
				logMessage('ERROR', 
					routeData.base_airport_iata + "-" + routeData.dest_airport_iata + "\t" +
					days + "\t" +
					this.getCurrentUrl() + "\t" +
					"Bad flight nos: " + parentFlightNum + " != " + newNumber);
					
				validCopy = false;
			}
			else
			{
				// proceed with the rest of the operation
				validCopy = true;
			}
		},
		
		function timeout()
		{
			logMessage('ERROR', "createNextDay(): timeout loading page " + this.getCurrentUrl());
			validCopy = false;
		},
		
		5000);
	});
	
	// do the rest only if the copy was successful, with copied flight numbers
	casper.then(function() {
	if (validCopy)
	{
		// save the low level flight data
		newFlightData = this.getFlightData();
		newFlightData.flight_id = -1;
		newFlightData.flight_number = routeData.flight_number;
		newFlightData.fleet_type_id = parentAircraftData.fleet_type_id;
		newFlightData.flight_model_id = newAircraftData.fleet_model_id;
		newFlightData.aircraft_reg = newAircraftData.aircraft_reg;
		
		// tick the "noSlots" checkboxes as required
		casper.then(function() {
			// are there slots available at base or destination?
			slotCount1 = parseInt(this.fetchText('#slotView2_1 > td.Data > span'));
			slotCount2 = parseInt(this.fetchText('#slotView2_2 > td.Data > span'));
			
			noSlotsVal = noSlots;
			if (slotCount1 === 0 || slotCount2 === 0)
			{
				noSlotsVal = true;
				
				// note the airport with no slots
				newFlightData.error = "No slots at " + (slotCount1 === 0 ? routeData.base_airport_iata : routeData.dest_airport_iata);
			}
			
			this.fill(EditRouteSelectors.form, {
			'noSlots1': noSlotsVal,
			'noSlots2': noSlotsVal,
			}, false);
			
			this.click('#confBtn');
		});

		casper.then(function() {
			this.waitForText('The route has been created.',

			function() {
				var newRouteURL = 'http://www.airwaysim.com' + this.getElementInfo(EditRouteSelectors.updatedRoute).attributes.href.replace('Edit', 'View');
				
				// extract route ID
				var m = newRouteURL.match(/game\/Routes\/View\/(\d+)/);
				
				newRoute.flight_id = newFlightData.flight_id = m[1];
//console.log(JSON.stringify(newFlightData, null, 4));
				
				newFlightDBData["fl_" + newFlightData.flight_id] = newFlightData;
			},

			function timeout() {
				logMessage('ERROR', 
					routeData.flight_number + "\t" +
					routeData.base_airport_iata + "-" + routeData.dest_airport_iata + "\t" +
					days + "\t" +
					this.getCurrentUrl() + "\t" +
					this.getHTML(EditRouteSelectors.routeErrorMessages, true));			
			});
		});
	}
	});

	casper.then(function () {	
		callback(newRoute);
	});
};


/*
	getMaintenanceData
	
	@param aircraftID AWS internal ID of aircraft
	@param callback callback function for returning results
	@return object { day (zero-indexed), hh, mm }
*/
casper.getMaintenanceData = function( aircraftData, callback )
{
	var maintenanceData = { 'day'	: -1, 'hh'	: -1, 'mm'	: -1 };	
	
	// first open the parent aircraft's schedule to get the maintenance time
	casper.thenOpen(scheduleAircraftIDURL +  aircraftData.aircraft_id, function() {
		casper.waitForSelector(ScheduleSelectors.maintenanceText, 
		
		function found()
		{
			var m = (this.getElementInfo(ScheduleSelectors.maintenanceText)).text.match(/(Mo|Tu|We|Th|Fr|Sa|Su) (\d{2}):(\d{2})\ -/);
			maintenanceData.day = weekDayNumbers[m[1]] - 1;
			maintenanceData.hh = m[2];
			maintenanceData.mm = m[3];
			
			callback(maintenanceData);
		},
		
		function timeout()
		{
			// bomb if maintenance window is unavailable on parent
			logMessage('ERROR', "getMaintenanceData{} : Parent aircraft " + aircraftData.aircraft_reg + " has no scheduled maintenance " + scheduleAircraftIDURL + aircraftData.aircraft_id);
			callback(maintenanceData);
		},
		
		3000
		);
	});
};

function ElementInfoReplace(name, val)
{
	if (name === 'attributes')
		return val.id;
	else
		return undefined;
}

/*
	assignRoutesToAircraft
	
	@param routes array of object { flight_id, flight_number, base_airport_iata, destination, assigned, day } of flights on this aircraft
	@param aircraftID AWS internal ID of aircraft
	@param callback callback function for returning results
	@return true on success, false otherwise
*/
casper.assignRoutesToAircraft = function(routes, aircraftData, callback)
{
	var flightsSeen = [];
	var base_id = "5237";
	
	// check whether we have all the routes or not; we do all or nothing
	casper.each(routes, function(casper, routeData, index) {
		if (routeData.assigned || routeData.flight_id == -1)
		{
			logMessage("ERROR", "Aborting route assignment to aircraft - all routes not available");
			callback(false);
		}
	});
	var base_id_sel = x('//*[@id="BaseID' + aircraftData.aircraft_id + '"]');
	
	//var base_id_sel = '[id^="BaseID"]';// + aircraftData.aircraft_id;
	
	// get base_id
	casper.waitForSelector(base_id_sel, 
		function()
		{
			base_id = this.getElementInfo(base_id_sel).text.trim();
		}, 
		
		function() {
			console.log("Selector "+base_id_sel+" not found");
			//console.log(this.getHTML());
			//callback(false);
		},
	6000);

	logMessage('INFO', "Assigning " + routes.length + " routes to aircraft " + aircraftData.aircraft_reg + " " + scheduleAircraftIDURL + aircraftData.aircraft_id);

	// now we open the new aircraft's schedule and get to work
	casper.thenOpen(scheduleAircraftIDURL + aircraftData.aircraft_id, function() {
	casper.waitForSelector(ScheduleSelectors.addFlightsBtn, 
		function found()
		{
			// check whether the schedule is empty, even of maintenance checks
			this.then(function () {
				if (this.exists(ScheduleSelectors.scheduleNotEmpty))
				{
					logMessage('ERROR', "Schedule not empty for new aircraft [" + aircraftData.aircraft_reg + "]");
					callback(false);					
				}
				else
				{
					logMessage('INFO', "Target aircraft [" + aircraftData.aircraft_reg + "] schedule is clear");
				}
			});
			
			// recursive helper function - looks for any of available flights in the paginated form, and advances to the 
			// next page if needed
			var addFlights = function() {
				var formData = {};
				var flightsOnScreen = 0;
				/*
				casper.evaluate(function(fleet, ac, base)
				{
					addFlights(fleet, ac, base, 1, 1); return false;
				}, aircraftData.fleet_type_id, aircraftData.aircraft_id, base_id);		*/		

				casper.thenClick(ScheduleSelectors.addFlightsBtn, function () {
					this.thenClick('#dialogAddFlight > div > a');
					this.waitWhileVisible('#loadingImage',
								
								function found() { },
								
								function timeout() 
								{
									logMessage('ERROR', 'Timeout waiting for #loadingImage');
									callback(false);
								},
								
								25000);

					this.waitUntilVisible(ScheduleSelectors.submitFlightsBtn, //ScheduleSelectors.pattern_flightSelectCheck.replace('%ID%', routes[0].flight_id), 
						
						function pager()
						{

							// now attempt to submit the form
							casper.then(function () {
								this.waitUntilVisible(ScheduleSelectors.addFlightsForm,
								
								function found() { },
								
								function timeout() 
								{
									logMessage('ERROR', 'Timeout waiting for add flights form');
									callback(false);
								},
								
								10000);
							
available_routes = this.getElementInfo(ScheduleSelectors.addFlightsForm).html.match(/showAddFlightMoreInfo\(\d+/g).map(function(str) { return str.replace(/showAddFlightMoreInfo\(/, ''); });
//console.log("on form: " + JSON.stringify(available_routes));							
//console.log(JSON.stringify(this.getElementsInfo('div[id="dialogAddRouteArea"] > div > div > label > input[id^="avlbRoutes"]'), null, 4));
								
//console.log(this.getElementsInfo('div[id="dialogAddRouteArea"] > div > div > label > input[id^="avlbRoutes"]').map(function (x, i, a) { return x.attributes.id; }));
								// add flights one by one to form data object
								casper.each(routes, function(casper, newFlight, index) {
									// we do not add flights that are unavailable (assigned to other aircraft)
									var flight_idcheck = ScheduleSelectors.pattern_flightSelectCheck.replace('%ID%', newFlight.flight_id);
									
									// only look for flights we haven't seen
									if (!newFlight.assigned &&
										flightsSeen.indexOf(newFlight.flight_id) == -1 &&
										//this.exists(ScheduleSelectors.addFlightsForm + " " + flight_idcheck))
										//this.exists(flight_idcheck))// && this.visible(flight_idcheck))
										available_routes.indexOf(newFlight.flight_id) != -1)
									{
//console.log(JSON.stringify(this.getElementInfo(flight_idcheck), null, 4));
//console.log("Found "+newFlight.flight_id+" (" + flight_idcheck +")<br>");					
										formData[flight_idcheck] = true;
										flightsSeen.push(newFlight.flight_id);
										flightsOnScreen++;
									}
									else
									{
//console.log("Missing " + flight_idcheck+"<br>");
									}
/*										formData["avlbRoutes" + newFlight.flight_id + "chk"] = true;
										flightsSeen.push(newFlight.flight_id);
										flightsOnScreen++;	
*/										
								});
								
								if (flightsOnScreen > 0)
								{
//console.log("Form: " + JSON.stringify(formData, null, 4));
									
									this.fillSelectors(ScheduleSelectors.addFlightsForm, formData, false);

									//this.fill(ScheduleSelectors.addFlightsForm, formData, false);
									this.thenClick(ScheduleSelectors.submitFlightsBtn);
//this.capture('c:/tmp/jxk.png');

								}
								else
								{
//this.capture('c:/tmp/xrerror.png');
									// get info about number of pages
									// pageInfo[0] = current page number
									// pageInfo[1] = number of pages
									var pageInfo = this.evaluate(function() {
										return [$('#dialogAddFlightPageJumper').val(), $('#dialogAddFlightPageJumper').children().length];
									});
									
									var newPage = parseInt(pageInfo[0]) + 1;
									if (newPage > pageInfo[1])
									{
										logMessage("ERROR", "Not all flights found - aborting assignment; need page "+newPage+"/"+pageInfo[1]);
										
										for (i=0; i < routes.length; i++)
										{
											if (flightsSeen.indexOf(routes[i].flight_id) == -1)
											{
												logMessage("ERROR", "Missing @"+routes[i].flight_number +"/"+routes[i].day+"@," + 
												routeViewURL + routes[i].flight_id);
											}
										}
										callback(false);
									}
									
									this.evaluate(function(newVal) {
										$('#dialogAddFlightPageJumper').val(newVal).trigger('change');
										
									}, newPage);
									
									/*this.waitForSelectorTextChange('#dialogAddRouteArea > div:nth-child(1) > div:nth-child(1) > label > b',
										function() { console.log("Loaded next page"); },
										
										function() { console.log("Uh-oh!"); },
										
										15000);*/
										
									pager();
								}
							});
							
							casper.waitUntilVisible("#notif1", //ScheduleSelectors.routesAdded,
								function success() 
								{
									logMessage('INFO', "Routes added to aircraft " + aircraftData.aircraft_reg);
									callback(true);								
								},
								
								function timeout()
								{
									if (this.visible(ScheduleSelectors.routeError))
									{

										logMessage('ERROR', "assignRoutesToAircraft(): Error adding routes to " + aircraftData.aircraft_reg + this.fetchText('#routeErrorMsgText'));
										callback(false);
									}
									else
									{
										logMessage('ERROR', 'Timeout waiting for visible add flights success message');
										this.capture('c:/tmp/jxrerror.png');
										callback(false);
									}
								},
								
								15000
							);							
						});
				});
				
				casper.then(function ()
				{
					if (flightsSeen.length < routes.length)
					{
						this.evaluate(function(fleet, ac, base)
						{
							addFlights(fleet, ac, base, 1, 1); return false;
						}, aircraftData.fleet_type_id, aircraftData.aircraft_id, base_id);	
						addFlights();
					}
				});

			};
			
			//console.log(addFlights);
			
				
			this.thenClick(ScheduleSelectors.addFlightsBtn, 
			
				function () 
				{
				this.evaluate(function(fleet, ac, base)
				{
					addFlights(fleet, ac, base, 1, 1); return false;
				}, aircraftData.fleet_type_id, aircraftData.aircraft_id, base_id);	
					//this.capture("C:/tmp/gotschedule.png"); 
				
					this.waitUntilVisible(ScheduleSelectors.submitFlightsBtn, //ScheduleSelectors.pattern_flightSelectCheck.replace('%ID%', routes[0].flight_id), 
						addFlights,

						function timeout()
						{
							logMessage('ERROR', "assignRoutesToAircraft(): Timeout loading scheduling form at " + this.getCurrentUrl());
							this.capture("C:/tmp/schedule.png"); 

							casper.exit(1);
						},
					
						8000);
			});
			});
		},
		
		function timeout()
		{
			logMessage('ERROR', "assignRoutesToAircraft(): Timeout opening scheduling page " + this.getCurrentUrl());
			callback(false);
		},
		
		10000
	);
};

/*
	buildNextDayRoutes
	
	@param parentRoutes array of object { flight_id, flight_number, day } of flights on parent aircraft
	@param aircraftID AWS internal ID of source aircraft
	@param callback callback function for returning results
	@return array of object { flight_id, flight_number, day } of next-day flights that are available to be assigned
*/
casper.buildNextDayRoutes = function(parentRoutes, aircraftData, noSlots, callback)
{
	var nextDayRoutes = [];
	
	logMessage('INFO', "Finding next-day routes for " + aircraftData.aircraft_reg);

	casper.then(function () {
		logHTML("<table class='CSSTableGenerator'><thead><tr><td>Status</td><td>Flt Num</td><td>Base-Dest</td><td>Days</td><td>Comment</td></tr></thead>\n<tbody>\n");
	});	

	casper.each(parentRoutes, function(casper, routeData, index) {

		nextDayRoutes[index] = {};
		
		casper.then(function() {
			casper.findRouteForNextDay(routeData, noSlots, function(data) {
				nextDayRoutes[index] = data;
			});
		});
		
		// if the route has not been found, then create it
		casper.then(function() {
			if (nextDayRoutes[index].flight_id === -1)
			{
				var newRoute = {};
				
				casper.createNextDay(routeData, noSlots, function(data) {
					newRoute = data;
					nextDayRoutes[index] = newRoute;
				});
				
				// bomb for bad data
				casper.then(function() {
					if (newRoute.flight_id === -1)
					{
						logMessage('ERROR', "Unable to create next day route for @"+newRoute.flight_number+" on "+newRoute.day+"@,"+this.getCurrentUrl());
						casper.exit(1);			
					}
					else
					{
						logMessage('OK', 
							nextDayRoutes[index].flight_number + "\t" +
							nextDayRoutes[index].base_airport_iata + "-" + nextDayRoutes[index].dest_airport_iata + "\t" +
							//getDayString(nextDayRoutes[index].day) + "\t" +
							//routeViewURL + nextDayRoutes[index].flight_id + "\t" +
							'@' + weekNumberDays[nextDayRoutes[index].day] + '@,' +
							routeViewURL + nextDayRoutes[index].flight_id + "\t" +
							'Created');					
					}
				});
			}
			else
			{
				// if we get a flight that is already assigned to another aircraft (unlikely) we report it but mark it as an error
				if (nextDayRoutes[index].error !== undefined)
				{
					logMessage('ERROR', 
						nextDayRoutes[index].flight_number + "\t" +
						nextDayRoutes[index].base_airport_iata + "-" + nextDayRoutes[index].dest_airport_iata + "\t" +
						'@' + weekNumberDays[nextDayRoutes[index].day] + '@,' +
						routeViewURL + nextDayRoutes[index].flight_id + "\t" + 
						nextDayRoutes[index].error);
				}
				else
				{
					logMessage((nextDayRoutes[index].assigned ? 'ERROR' : 'OK'), 
						nextDayRoutes[index].flight_number + "\t" +
						nextDayRoutes[index].base_airport_iata + "-" + nextDayRoutes[index].dest_airport_iata + "\t" +
						'@' + weekNumberDays[nextDayRoutes[index].day] + '@,' +
						routeViewURL + nextDayRoutes[index].flight_id + "\t" +
						(nextDayRoutes[index].assigned ? 'Assigned' : 'Available'));
				}
			}
		});
	});

	casper.then(function() {
		logHTML("\n</tbody>\n</table>\n");
		callback(nextDayRoutes);
	});	
};



/*
	assignMaintenanceToAircraft
	
	@param aircraftID AWS internal ID of aircraft
	@param day zero-indexed day of the week
	@param hour HH24 start time
	@param minute start time (5-minute precision)
	@param callback callback function for returning results
	@param mtxA perform A check
	@param mtxB perform B check
	@return true on success, false otherwise
*/
casper.assignMaintenanceToAircraft = function(aircraftData, day, hour, minute, callback, mtxA, mtxB)
{
	if (aircraftData.aircraft_id === undefined || aircraftData.aircraft_id === -1)
	{
		callback(false);
		return 0;
	}
	
	if (mtxA === undefined)
		mtxA = false;
	if (mtxB === undefined)
		mtxB = false;

	this.thenOpen(scheduleAircraftIDURL + aircraftData.aircraft_id, function() {
		if (this.visible('#loadingAnimation'))
		{
			this.waitWhileVisible('#loadingAnimation', 
				function() {
				}, 

				function(){
					//console.log("loadingAnimation no longer visible");
				},
				2000);
		}
		
		this.thenClick('#submenuContainer > div > form > div.filterSubmit > input[type="submit"]', function() {
		//this.waitForSelector(ScheduleSelectors.addMaintenanceBtn,
		//	function found()
		//	{
				// now schedule maintenance
		//		this.thenClick('a[title="Set maintenance"]', function () {
		this.evaluate(function(id) {
			setMaintenance(id, 0);
			}, aircraftData.aircraft_id);
			//this.capture("C:/tmp/mtxschedule.png"); 
					//this.waitUntilVisible(ScheduleSelectors.maintenanceSubmitBtn, 
					//	function found()
					//	{
							var formData = {};
							
							// copy time and set day from parent
							formData[ScheduleSelectors.maintenanceADay] = day;
							//formData[ScheduleSelectors.pattern_maintenanceADay.replace('%DAY%', day)] = true;
							formData[ScheduleSelectors.maintenanceAHour] = hour;
							formData[ScheduleSelectors.maintenanceAMinute] = minute;
							formData[ScheduleSelectors.maintenanceANow] = mtxA;
							//formData[ScheduleSelectors.maintenanceBDay] = day;
							//formData[ScheduleSelectors.maintenanceBHour] = hour;
							//formData[ScheduleSelectors.maintenanceBMinute] = minute;
							formData[ScheduleSelectors.maintenanceBNow] = mtxB;
							//formData[ScheduleSelectors.maintenanceSameForB] = true;	// generally the case
							
							
					
							// fill form elements with .change() handlers, and submit
							this.then(function() {
								this.click('#dialogAddMaintADay' + day.toString());
								this.evaluate(function(h, m) {
									$('#dialogAddMaintBsame').prop('checked','true').trigger('change');
									$('#dialogAddMaintADepH').val(h).change();
									$('#dialogAddMaintADepM').val(m).change();
								}, hour, minute);	
								//require('utils').dump(formData);
								this.fill(ScheduleSelectors.addMaintenanceForm, formData, false);
								//require('utils').dump(this.getFormValues(ScheduleSelectors.addMaintenanceForm));
								// click the radio button for day
								//this.click(ScheduleSelectors.pattern_maintenanceADay.replace('%DAY%', day));
								
								// click the "same for B" checkbox to complete form
								//this.click('#' + ScheduleSelectors.maintenanceSameForB);
								
								//logMessage('DEBUG', "maintenance: day = " + day + ", selector = " + ScheduleSelectors.pattern_maintenanceADay.replace('%DAY%', day) + ", time = " + hour + ":" + minute);

								
								//this.capture('/home/delano/xrbefore.png');
								//require('utils').dump(this.getFormValues(ScheduleSelectors.addMaintenanceForm));
								this.click(ScheduleSelectors.maintenanceSubmitBtn);
								
								//this.capture('/home/delano/xrfinal.png');
							});
							
							this.waitUntilVisible("#sideNotificationArea", //ScheduleSelectors.maintenanceAdded,
								function success() 
								{
									logMessage('INFO', "Maintenance added to aircraft " + aircraftData.aircraft_reg);
									callback(true);								
								},
								
								function timeout()
								{
									if (this.visible(ScheduleSelectors.routeError))
									{
										console.log(JSON.stringify(this.getElementInfo(ScheduleSelectors.routeError), null, 4));
										logMessage('ERROR', "assignMaintenanceToAircraft(): Error adding maintenance to " + aircraftData.aircraft_reg + ": overlapping flights");
										callback(false);
									}
									else
									{
										logMessage('ERROR', 'Timeout waiting for visible maintenance success message');
										this.capture('c:/tmp/jxrerror.png');
										callback(false);
									}
								},
								
								10000
							);
						/*},
						
						function timeout()
						{
							logMessage('ERROR', "assignMaintenanceToAircraft(): Timed out waiting for maintenance form on " + this.getCurrentUrl());
							casper.capture("C:/tmp/badschedule.png");
	
							callback(false);
						},
						
						5000
					);*/
		//		});
		//	},
			
		//	function timeout()
		//	{
		//		logMessage('ERROR', "assignMaintenanceToAircraft(): Timeout opening scheduling page " + this.getCurrentUrl());
		//		callback(false);	
		//	},
			
		//	10000
		//);
	});
	});
};

/* flightData is an array with each entry of the following structure
/ "fl_<flight_id>" : 
	{	"flight_id" : "438873"
		"aircraft_type" : "A332"
		"aircraft_reg" : "CC-MBT"
		"base_airport_iata" : "SCL"
		"dest_airport_iata" : "VVI"
		"flight_number" : "QV417"
		"fleet_type_id" : "o8"
		"distance_nm" : 1031
		"outbound_dep_time" : "18:50"
		"outbound_arr_time" : "21:55"
		"outbound_length" : "03:05"
		"turnaround_mins" : "210"
		"min_turnaround_mins" : "90"
		"inbound_dep_time" : "00:25"
		"inbound_arr_time" : "03:30"
		"inbound_length" : "03:05"
		"days_flown" : "b'0100000'"
	},
	...
*/
casper.sendFlightsToDB = function (flightData)
{
	if(Object.getOwnPropertyNames(flightData).length !== 0)
	{
//console.log(JSON.stringify(flightData, null, 4));

		postDataObj = {}; 
		postDataObj.instance = new Array(6).join().replace(/(.|$)/g, function(){return ((Math.random()*36)|0).toString(36)[Math.random()<0.5?"toString":"toUpperCase"]();});
		postDataObj.game_id = gameID;
		postDataObj.newFlightData = JSON.stringify(flightData);

		casper.thenOpen('http://localhost/aws/add_routes.php',
		{
			method: 'post',
			data: postDataObj
		});	
	}	
};

function __addNextDay(parentAircraft, noSlots, newAircraft)
{
	var parentRoutes = [];
	var nextDayRoutes = [];
	
	casper.then(function()
	{
		casper.verifyAircraft(parentAircraft, function (data) {
			parentAircraftData = data;
			if (parentAircraftData.aircraft_id === -1)
			{
				logMessage('ERROR', "Bad parent aircraft identifier [" + parentAircraft + "]");
				casper.exit(1);
			}
			else
			{
				logMessage('OK', "Validated parent aircraft " + parentAircraftData.aircraft_reg + " (" + parentAircraftData.aircraft_id +") at "+parentAircraftData.base_airport_iata);
			}
		});
	});

	// if parameter newAircraft is a string we are going to assign routes to that aircraft
	casper.then(function()
	{
		if (typeof newAircraft === 'string')
		{
			casper.verifyAircraft(newAircraft, function (data) {
				newAircraftData = data;
				if (newAircraftData.aircraft_id === -1)
				{
					logMessage('ERROR', "Bad new aircraft identifier [" + newAircraft + "]");
					casper.exit(1);
				}
				else if (parentAircraftData.fleet_type_id != newAircraftData.fleet_type_id)
				{
					logMessage('ERROR', "Fleet type mismatch of parent [" + parentAircraft + "] and new aircraft [" + newAircraft + "]");
					casper.exit(1);
				}
				else if (parentAircraftData.base_airport_iata != newAircraftData.base_airport_iata)
				{
					logMessage('ERROR', "Base mismatch of parent [" + parentAircraft + "] (" + parentAircraftData.base_airport_iata + ") and new aircraft [" + newAircraft + "] (" + newAircraftData.base_airport_iata + ")");
					casper.exit(1);
				}
				else if (parentAircraftData.aircraft_id === newAircraftData.aircraft_id)
				{
					logMessage('ERROR', "Duplicate source and destination aircraft");
					casper.exit(1);
				}
				else
				{
					logMessage('OK', "Validated new aircraft " + newAircraftData.aircraft_reg + " (" + newAircraftData.aircraft_id +") at "+newAircraftData.base_airport_iata);
				}
			});
		}
	});


	// now we look for the routes in the parent aircraft
	casper.then(function() {
		//logMessage('INFO', "Finding routes on " + aircraftNames[parentAircraftData.aircraft_id]);
		casper.getRouteData(parentAircraftData.aircraft_id, function(data) 
		{
			parentRoutes = data;
		});
	});
		
	casper.then(function() {
		// carp for empty parent schedule
		if (parentRoutes.length === 0)
		{
			logMessage('ERROR', "Aircraft " + parentAircraftData.aircraft_reg  + " has no routes");
			casper.exit(1);
		}
		else
		{
			logMessage('DEBUG', "Got " + parentRoutes.length + " routes on " + parentAircraftData.aircraft_reg );
		}
	});
	

	// look for next-day routes matching those in the parent
	casper.then(function() {
		casper.buildNextDayRoutes(parentRoutes, parentAircraftData, noSlots, function(data){
			nextDayRoutes = data;
			
			// I suppose we could validate the number of routes found, or something
		});
	});

	// if we have been given a valid destination aircraft, assign routes and maintenance
	var status = false;

	casper.then(function()
	{
		if (newAircraftData.aircraft_id !== -1)
		{
			// get the maintenance details from the parent
			var parentMaintenance = {};
			
			casper.then(function() {
				casper.getMaintenanceData(parentAircraftData, function(data) {
					parentMaintenance = data;
//console.log(JSON.stringify(parentMaintenance, null, 4));

					// now assign maintenance
					var newMaintenanceDay = (parseInt(parentMaintenance.day) + 1 == 7 ? 0 : parseInt(parentMaintenance.day) + 1);
					
					casper.assignMaintenanceToAircraft(newAircraftData, newMaintenanceDay, parentMaintenance.hh, parentMaintenance.mm, function(s) {
						status = s;
						if (!status)
						{
							casper.exit(1);
						}
					});
				});
			});
			
			// assign flights to the target aircraft
			casper.then(function() {
				casper.assignRoutesToAircraft(nextDayRoutes, newAircraftData, function(s) {
					status = s;
					if (!status)
					{
						casper.exit(1);
					}
				});
			});

			casper.then(function() {
				if (status)
				{
					this.sendFlightsToDB(newFlightDBData);
					logMessage('INFO', "Complete");
				}
			});
		}
	});

	return status;
}



function rebase(aircraft, newBase)
{
}

function runMaintenance(aircraft, type)
{
}

function terminateLease(aircraft)
{
}

function moveRoutes(from, to)
{
}

function swapRoutes(from, to)
{
}
