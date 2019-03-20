if (!Array.prototype.fill) {
  Array.prototype.fill = function(value) {

    // Steps 1-2.
    if (this === null) {
      throw new TypeError('this is null or not defined');
    }

    var O = Object(this);

    // Steps 3-5.
    var len = O.length >>> 0;

    // Steps 6-7.
    var start = arguments[1];
    var relativeStart = start >> 0;

    // Step 8.
    var k = relativeStart < 0 ?
      Math.max(len + relativeStart, 0) :
      Math.min(relativeStart, len);

    // Steps 9-10.
    var end = arguments[2];
    var relativeEnd = end === undefined ?
      len : end >> 0;

    // Step 11.
    var final = relativeEnd < 0 ?
      Math.max(len + relativeEnd, 0) :
      Math.min(relativeEnd, len);

    // Step 12.
    while (k < final) {
      O[k] = value;
      k++;
    }

    // Step 13.
    return O;
  };
}


function compareTimetables(a, b) {
  if (a.base_airport_iata < b.base_airport_iata) {
    return -1;
  }
  else if (a.base_airport_iata > b.base_airport_iata) {
    return 1;
  }
  if (a.fleet_type_id < b.fleet_type_id) {
    return -1;
  }
  else if (a.fleet_type_id > b.fleet_type_id) {
    return 1;
  }
  else if (a.timetable_name < b.timetable_name)
    return -1;
  else if (a.timetable_name > b.timetable_name)
    return 1;
  else
	return 0;
}


function getAircraftURLData(html)
{
	var retVal = [ {}, {} ];
	
	retVal[0].href = retVal[0].text = retVal[1].href = retVal[1].text  = "";
	
	// extract aircraft info
	var re = new RegExp('href=["]([^"]+)["].+>([^<]+)<\/a', 'igm');

	var m = re.exec(html);
	//logMessage('DEBUG', "Round 1 [" + m.join("]\n[") + "]");
	retVal[0].href = m[1];
	retVal[0].text = m[2];

	// run again
	m = re.exec(html);
	if (m !== null)
	{
		//logMessage('DEBUG', "Round 2 [" + m.join("]\n[") + "]");
		retVal[1].href = m[1];
		retVal[1].text = m[2];
	}
	
	return retVal;
}


var timetableData = [];
var timetableSampleFlights = [];
var aircraftData = {};
var output = [];


casper.getTimetableGaps = function(timetableData, callback)
{
	//console.log(JSON.stringify(timetableData, null, 4));

	if (timetableData === null || timetableData === undefined || !Array.isArray(timetableData.timetables))
	{
		callback(null);
		return;
	}
	else
	{
		total = 0;
		for (i=0; i < timetableData.timetables.length; i++)
		{
			if (timetableData.timetables[i].timetable_id === undefined)
			{
				callback(null);
				return;
			}
		}
	}
	
	timetableData.timetables.sort(compareTimetables);
//console.log(JSON.stringify(timetableData.timetables, null, 4));
	casper.each(timetableData.timetables, function(casper, obj, index)
	{
		var maxDistance = 0;
		timetableSampleFlights.push({});
		idx = timetableSampleFlights.length - 1;
		done = false;
		// find the first non-MTX flight and add it to the object
		for (i=0; i < obj.entries.length; i++)
		{
			if (!done && obj.entries[i].flight_number != 'MTX')
			{
				var dayArray = new Array(7);
				dayArray.fill("");
				timetableSampleFlights[idx] = 
				{ 
					timetable_id: obj.timetable_id,
					name: obj.timetable_name, 
					firstFlight: obj.entries[i].flight_number, 
					base_airport_iata:  obj.base_airport_iata,
					fleet_type_id: obj.fleet_type_id,
					fleet_type: obj.fleet_type,
					days: dayArray
				};
				done = true;
			}
			maxDistance = Math.max(obj.entries[i].distance_nm, maxDistance);
		}
		timetableSampleFlights[idx].max_distance_nm = maxDistance;
	});


	// now look for each sample flight in the Manage Routes page
	casper.then(function() {
	casper.each(timetableSampleFlights, function (casper, timetableObj, index)
	{
		//console.log(JSON.stringify(timetableObj));
		//console.log("timetable "+timetableObj.name+", flight "+timetableObj.firstFlight);
		
		casper.thenOpen('http://www.airwaysim.com/game/Routes/Manage/?Keyword=' + timetableObj.firstFlight, function() {

		var flightNumber = timetableObj.firstFlight;
		var aircraftLinks;
		var days;
		var acTooltips;
		
	//logMessage('DEBUG', this.getCurrentUrl());	
		//timetableObj.validFlight = false;
		this.waitWhileVisible('#loadingAnimation', function() {}, function() {}, 3000);
		this.waitForSelector('tr[id^="rData"]', 
			function found()
			{
				//logMessage('DEBUG', "timetable [" + timetableObj.name + "] (" +  timetableObj.base_airport_iata + "): valid flight [" + flightNumber + "]");
				aircraftLinks = this.getElementsInfo(ManageRouteSelectors.assignedAircraftCell);
				days = this.getElementsInfo(ManageRouteSelectors.flightDays);

				acTooltips = (this.exists(ManageRouteSelectors.aircraftTooltip) ? this.getElementsInfo(ManageRouteSelectors.aircraftTooltip) : null);
				
				if (acTooltips === null)
				{
					timetableObj.validFlight = false;
//					console.log(timetableObj.firstFlight, JSON.stringify(acTooltips, null, 4));
				}
				else //if (aircraftLinks.length == acTooltips.length)
				{
					timetableObj.validFlight = true;
					//console.log("timetable = "+timetableObj.name+"; flight_number = "+flightNumber+"; aircraftLinks.length = "+aircraftLinks.length + "; acTooltips.length = "+acTooltips.length);
				}
			}, 
			
			function timeout()
			{
this.capture('c:/temp/xrerror.png');
				return null;
			}, 
		
			3000
		);
		
		// ignore this timetable, as something is wrong with it
		casper.then(function() {
			if (timetableObj.validFlight)
			{
				// extract data from the rows displayed
				var acIndex = 0;
				casper.each (aircraftLinks, function(casper, acInfo, index)
				{
					var acData = getAircraftURLData(acInfo.html);
					var q = (days[index].text.split(':'))[1].replace(/\D+/g, '');
					
					// if we get a value for the second link (registration of the a/c operating the flight)
					// we know the flight is correctly allocated
					if (acData[1].text !== "" && parseInt(q, 10) - 1 <= 6)
					{
						logMessage('DEBUG', "flight " + timetableObj.firstFlight + ", day = " + q + ", a/c = " + acData[1].text);
						
						// record the a/c reg flying that specific day
						var reg = acData[1].text;
						timetableObj.days[parseInt(q, 10) - 1] = reg;
						aircraftData[reg] = { };
						
						// now get some bits from the tooltip
						var re =  new RegExp('Nominal range:\\s+(\\d+)\\s+nm', 'gim');
						aircraftData[reg].range  = re.exec(acTooltips[acIndex].html)[1];

						var re2 = new RegExp('<b>(.+)</b>', 'g');
						aircraftData[reg].model = re2.exec(acTooltips[acIndex].html)[1];
						
						// these exist only for assigned aircraft, so we have a separate index
						acIndex++;
					}
					else
					{
						logMessage('DEBUG', "Flight " + timetableObj.firstFlight + " on day " + q + " not assigned to any aircraft");
					}
				});
			}
		});
		});
	});
	});
	

	// now we get the number of aircraft required
	casper.then(function()
	{
		casper.each(timetableSampleFlights, function (casper, timetableObj, index)
		{
			// find last aircraft and number required
			// this is done by finding the first zero entry in the "days" array
			// following from a "1"
			var lastSeen = 6;
			var lastAssigned = -1;
			
			var unassignedCount = 0;
			for (i=0; i < 7; i++)
			{
				if (timetableObj.days[i] === "")
				{
					unassignedCount++;
					if (timetableObj.days[lastSeen] !== "")
					{
						lastAssigned = lastSeen;
					}
				}
				lastSeen = i;
			}
	//		console.log(lastAssigned, timetableObj.days[lastAssigned], 
	//			JSON.stringify(aircraftData[timetableObj.days[lastAssigned]], null, 4),
	//			JSON.stringify(timetableObj, null, 4));
			
			var lastAircraftDetails = "";
			timetableObj.lastAircraft = {};
			timetableObj.lastAssigned = lastAssigned;

			if (unassignedCount === 0)
			{
				return;
			}
			else if (unassignedCount != 7)
			{
				// add details to object
				timetableObj.lastAircraft = {};
				timetableObj.lastAircraft.model = aircraftData[timetableObj.days[lastAssigned]].model;
				timetableObj.lastAircraft.range = aircraftData[timetableObj.days[lastAssigned]].range;
				timetableObj.lastAircraft.registration = timetableObj.days[lastAssigned];
				
				// add details to string
				lastAircraftDetails = 
				timetableObj.days[lastAssigned] +  "\t" + 
				aircraftData[timetableObj.days[lastAssigned]].model + "\t" + 
				aircraftData[timetableObj.days[lastAssigned]].range;
			}

			timetableObj.unassignedCount = unassignedCount;
			output.push(timetableObj);
		});
		
		callback(output);
	});
};
