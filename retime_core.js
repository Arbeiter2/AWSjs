/*
retime_core.js
*/
phantom.injectJs( 'getflightdata.js' );
phantom.injectJs( 'schedules.js');

var routeSearchFlNumURL = 'http://www.airwaysim.com/game/Routes/Manage/?Keyword=';
var routeViewURL = 'http://www.airwaysim.com/game/Routes/View/';

var editViewRe = /game\/Routes\/Edit\/(\d+)/;

function getDayString(dayNumber)
{
	return "-".repeat(dayNumber - 1) + dayNumber + "-".repeat(7 - dayNumber);
}


var FlightDBData = [];

/*
changes is an array of change requests of the following form
[
	{ flight_number: "QV102",
	  fleet_type_id: 23,
	  new_time: { hh: 00, mm: 25 }, 
	  new_day: 7,
	  turnaround : { hh: 00, mm: 25 } }
	...
]

new_day and turnaround are optional
*/
casper.retime = function(changes, getSlots)
{
	var retVal = false;
	
	casper.then(function() {
	// if we get no getSlots, assume no slot will be purchased
	if (getSlots === undefined)
		getSlots = false;

	// verify that the lists are all the same length
	if (changes === undefined || !Array.isArray(changes) || changes.length === 0)
		return false;

	// verify all entries in time list, copy to internal hh:mm object
	for (tt=0; tt < changes.length; tt++)
	{
		if (parseInt(changes[tt].new_time.hh, 10) > 23 || parseInt(changes[tt].new_time.mm, 10) > 55 || parseInt(changes[tt].new_time.mm, 10) % 5 !== 0)
		{
			return false;
		}

		if (changes[tt].turnaround !== undefined &&
		 (parseInt(changes[tt].turnaround.hh, 10) > 23 || parseInt(changes[tt].turnaround.mm, 10) > 55 || parseInt(changes[tt].turnaround.mm, 10) % 5 !== 0))
		{
			return false;
		}
	}
	retVal = true;
	});

	casper.then(function() {
//require('utils').dump(changes);
	
	if (retVal) {
	var links = [];
	logHTML("<table class='CSSTableGenerator'><thead><tr><td>Status</td><td>Flt Num</td><td>Orig-Dest</td><td>Old<br />Dep</td><td>New<br />Dep</td><td>Days Flown</td><td>Comment</td></tr></thead>\n<tbody>");
	casper.each(changes, function(casper, changeObj, index) {
		
			// check whether the original flights exist
			casper.thenOpen(routeSearchFlNumURL + changeObj.flight_number, function() {
				//logMessage('DEBUG', this.getCurrentUrl());

				this.waitForSelector(ManageRouteSelectors.editRouteLinks,
					function found()
					{
						links = this.getElementsInfo(ManageRouteSelectors.editRouteLinks);
					},
					
					function timeout()
					{
						logMessage('ERROR', "Flight [" + changeObj.flight_number + "] not found");
						casper.exit(1);
					},
					
					20000
				);
			});
			
			var days = "-------";
			casper.then(function () {

				casper.each(links, function(casper, editLink, index) {

					var oldTime = { "hh" : "--", "mm" : "--" };
					var base = "???";
					var dest = "???";
					
					this.clear();

					casper.thenOpen('http://www.airwaysim.com/' + editLink.attributes.href, function() {
					
						var f = editLink.attributes.href.match(editViewRe);
						var flightID = f[1];
						var status = 'OK';
						var message = "";

						this.waitForSelector(EditRouteSelectors.confirm,

							function found()
							{
								var formData = {};
								
								var qmc = this.getFormValues(EditRouteSelectors.form);
								formData["#FleetID"] = qmc['FleetID'];
								
								//require('utils').dump(qmc);
					
//require('utils').dump(qmc);
								// change fleet_type_id first
								/*
								if (changeObj.fleet_type_id !== undefined && changeObj.fleet_type_id.match(/^\d+$/))
								{
									FleetID = 'a' + changeObj.fleet_type_id;
									this.evaluate(function(fleet_type_id) {
										$('#FleetID').val(fleet_type_id).change();
										$('#Turn1').val(70).change();
									}, FleetID);
									this.waitWhileVisible('#loadingImage');
									
									formData["#FleetID"] = FleetID;
								}
								*/

								
								oldTime.hh = qmc[EditRouteSelectors.outbound_dep_HH.replace(/\#/, '')];
								oldTime.mm = qmc[EditRouteSelectors.outbound_dep_MM.replace(/\#/, '')];
								
								formData[EditRouteSelectors.outbound_dep_HH] = changeObj.new_time.hh;
								formData[EditRouteSelectors.outbound_dep_MM] = changeObj.new_time.mm;
								
								if (changeObj.turnaround !== undefined)
								{
									formData[EditRouteSelectors.turnaround_mins] = changeObj.turnaround.hh * 60 + changeObj.turnaround.mm
								}
								
								base = this.getElementInfo(EditRouteSelectors.base).text;
								dest = this.getElementInfo(EditRouteSelectors.destination).text;
								
								// if we have only one flight with the specified number, change the flight day is specified
								if (changeObj.new_day !== undefined && links.length == 1)
								{
									//logMessage('DEBUG', "applying day change -> " +changeObj.new_day);
									days = "";
									for (var i=0; i < 7; i++)
									{
										formData["#Days" + i] = (changeObj.new_day - 1 == i ? true : false);
										days += (changeObj.new_day - 1 == i ? i+1 : '-');
									}
								}
								else
								{
									days = (this.getFormValues(EditRouteSelectors.form).Days0 ? '1' : '-') +
											   (this.getFormValues(EditRouteSelectors.form).Days1 ? '2' : '-') +
											   (this.getFormValues(EditRouteSelectors.form).Days2 ? '3' : '-') +
											   (this.getFormValues(EditRouteSelectors.form).Days3 ? '4' : '-') +
											   (this.getFormValues(EditRouteSelectors.form).Days4 ? '5' : '-') +
											   (this.getFormValues(EditRouteSelectors.form).Days5 ? '6' : '-') +
											   (this.getFormValues(EditRouteSelectors.form).Days6 ? '7' : '-');
								}

											   
								// keep slots unpurchased if --slots not set
								if (!getSlots)
								{
									if (this.exists(EditRouteSelectors.noSlots1))
										formData[EditRouteSelectors.noSlots1] = true;
									if (this.exists(EditRouteSelectors.noSlots2))
										formData[EditRouteSelectors.noSlots2] = true;
								}
								
								//require('utils').dump(formData);
									
								this.fillSelectors(EditRouteSelectors.form, formData, false);
								
								// save the data before submitting
								FlightDBData.push(this.getFlightData());
									
								// submit the form
								this.click(EditRouteSelectors.confirm);
								
								// wait for the panel with "Error" or "OK"
								this.waitUntilVisible(EditRouteSelectors.routeSuccessMessage,
									function visible()
									{
										message = this.fetchText(EditRouteSelectors.routeSuccessMessage);
									},
									
									function fail()
									{
										status = 'ERROR';
										message = "<ul class='small'>" + this.getHTML(EditRouteSelectors.routeErrorMessages, true) + "</ul>";
									},
									
									6000
								);
							},
							
							function timeout()
							{
								status = 'TIMEOUT';
							},
							
							30000
						);
						
						this.then(function() {
							logMessage(status, '@' + changeObj.flight_number + '@,' + 'http://www.airwaysim.com' + editLink.attributes.href.replace(/Edit/, 'View') + "\t" + 
							base + "-" + dest + "\t" +
							oldTime.hh + ":" + oldTime.mm + "\t" + 
							changeObj.new_time.hh + ":" + changeObj.new_time.mm + "\t" + 
							days + "\t" +
							message);
						});
					});
				});
			});
		});
	}
	});

	casper.then(function() {
		if (retVal)
		{
		logHTML("\n</tbody>\n</table>\n");

		casper.sendFlightsToDB(FlightDBData);
		logMessage('INFO', 'Complete');
		}
		
		return retVal;
	});	
};