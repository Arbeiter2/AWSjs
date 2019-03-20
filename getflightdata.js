/*
gets everything incl. the flight_id value
*/

function MinutesToHHMM(minutes)
{
	return ("0" + ~~(minutes / 60)).slice(-2) + ':' +  ("0" + (minutes % 60)).slice (-2);
}

casper.getFlightData = function()
{
	var flightDataObj = {};
	
	pf = this.getCurrentUrl().match(/\/(\d+)\/?/i);
	if (pf !== null)
		flightDataObj.flight_id	= pf[1];

	flightDataObj.number = this.getElementInfo('#Number').attributes.value;
	flightDataObj.flight_number	= this.fetchText('#fltNum1Area').substring(0, 2) + this.getElementInfo('#Number').attributes.value;

	flightDataObj.base_airport_iata	=  this.getElementInfo(EditRouteSelectors.base).text;
	flightDataObj.dest_airport_iata	=  this.getElementInfo(x("//td[normalize-space(text()) = 'Destination']/following-sibling::td[1]/span/a")).text;
	flightDataObj.fleet_type_id	= this.getFormValues(EditRouteSelectors.form).FleetID.substr(1);		
	
	flightDataObj.distance_nm	= 0;

	sector_distances = this.getElementsInfo(EditRouteSelectors.sector_distances);
	
	// slightly dodgy: add up all distances in col 3
 	max_dist = 0;
	for (z=0; z < sector_distances.length; z++)
		flightDataObj.distance_nm = Math.max(max_dist, parseInt(sector_distances[z].text.trim().replace(/\D+/g, '')));

	sector_airports = this.getElementsInfo(EditRouteSelectors.sector_airports);
	
/*	
	// handle multi-stop flights
	if (sector_airports.length > 2)
	{
		flightDataObj.sectors = [];

		// airport codes
		for (index=0; index < sector_airports.length; index++)
		{
			flightDataObj.sectors[index] = { start_airport_iata : sector_airports[index].text };
		}

		// distances
		sector_distances = this.getElementsInfo(EditRouteSelectors.sector_distances);
		for (index=0; index < sector_distances.length; index++)
		{
			flightDataObj.sectors[index].distance_nm = sector_distances[index].text.replace(/\D/g, '');
		}
		
		// flight times
		sector_lengths = this.getElementsInfo(EditRouteSelectors.sector_lengths);
		for (index=0; index < sector_lengths.length; index++)
			flightDataObj.sectors[index].sector_length = sector_lengths[index].text.trim().replace(/ h /, ':').replace(/ min/, '');
		

		// do final construction
		outbound = true;
		last_out = last_in = 0;
		for (index=0; index < flightDataObj.sectors.length; index++) 
		{
			// copy destination airport from next entry
			if (index == flightDataObj.sectors.length - 1)
				flightDataObj.sectors[index].end_airport_iata = flightDataObj.sectors[0].start_airport_iata;
			else
				flightDataObj.sectors[index].end_airport_iata = flightDataObj.sectors[index + 1].start_airport_iata;
			
			// as soon as we see the final destination, we set everything thereafter as inbound
			if (outbound && flightDataObj.sectors[index].start_airport_iata == flightDataObj.dest_airport_iata)
				outbound = false;
			
			flightDataObj.sectors[index].direction = (outbound ? "out" : "in");
			flightDataObj.sectors[index].seq_number = (outbound ? last_out++ : last_in++);
		}
	} 	
	flightDataObj.distance_nm	= $('#routeEditorArea > div.borderOuter > div.borderInner.smallDataBox > table > thead > tr:nth-child(1) > td > table > thead > tr:nth-child(1) > td.BgNr.alCenter')[0].innerHTML.replace(/\D/g, '');
	*/
	//console.log(flightDataObj.distance_nm);


	// handle multi-stop flights
	if (sector_airports.length > 2)
	{
		flightDataObj.sectors = [];
		sector_lengths = this.getElementsInfo(x("//div[contains(text(),'Total scheduled flight time:')]/following-sibling::div[1]"));

		// airport codes
		outbound = true;
		last_out = last_in = 0;
		for (index=0; index < sector_airports.length; index++)
		{
			flightDataObj.sectors[index] = {};
			
			flightDataObj.sectors[index].start_airport_iata = sector_airports[index].html;
			flightDataObj.sectors[index].distance_nm = sector_distances[index].text.replace(/\D/g, '');
			flightDataObj.sectors[index].sector_length = sector_lengths[index].text.trim().replace(/ h /, ':').replace(/ min/, '');

			// copy destination airport from next entry
			
			if (index > 0)
			{
				flightDataObj.sectors[index-1].end_airport_iata = flightDataObj.sectors[index].start_airport_iata;

				if (index == sector_airports.length - 1)
					flightDataObj.sectors[index].end_airport_iata = flightDataObj.sectors[0].start_airport_iata;
			}
			
			// as soon as we see the final destination, we set everything thereafter as inbound
			if (outbound && flightDataObj.sectors[index].start_airport_iata == flightDataObj.dest_airport_iata)
				outbound = false;
			
			flightDataObj.sectors[index].direction = (outbound ? "out" : "in");
			flightDataObj.sectors[index].seq_number = (outbound ? last_out++ : last_in++);
		
		}
	}
	
	// time fields
	this.capture("c:/tmp/screen.png")
	flightDataObj.outbound_dep_time	= this.getFormValues(EditRouteSelectors.form).Dep1H + ':' + this.getFormValues(EditRouteSelectors.form).Dep1M;
	flightDataObj.outbound_arr_time	= this.getHTML(EditRouteSelectors.outbound_arr_tm).trim().replace(/ h /, ':').replace(/ min.*/, '');
	flightDataObj.outbound_length	= this.getHTML(EditRouteSelectors.outbound_flt_tm).trim().replace(/ h /, ':').replace(/ min.*/, '');
	flightDataObj.inbound_dep_time	= this.getHTML(EditRouteSelectors.inbound_dep_tm).trim().replace(/ h /, ':').replace(/ min.*/, '');
	flightDataObj.inbound_arr_time	= this.getHTML(EditRouteSelectors.inbound_arr_tm).trim().replace(/ h /, ':').replace(/ min.*/, '');
	flightDataObj.inbound_length	= this.getHTML(EditRouteSelectors.inbound_flt_tm).trim().replace(/ h /, ':').replace(/ min.*/, '');
	flightDataObj.turnaround_length	= MinutesToHHMM(this.getFormValues(EditRouteSelectors.form).Turn1);
	
	flightDataObj.min_turnaround_length = MinutesToHHMM(this.getElementInfo(EditRouteSelectors.min_turnaround_mins).attributes.value);

	flightDataObj.days_flown	= "b'" +
			 (this.getFormValues(EditRouteSelectors.form).Days0 ? 1 : 0) +
			 (this.getFormValues(EditRouteSelectors.form).Days1 ? 1 : 0) +
			 (this.getFormValues(EditRouteSelectors.form).Days2 ? 1 : 0) +
			 (this.getFormValues(EditRouteSelectors.form).Days3 ? 1 : 0) +
			 (this.getFormValues(EditRouteSelectors.form).Days4 ? 1 : 0) +
			 (this.getFormValues(EditRouteSelectors.form).Days5 ? 1 : 0) +
			 (this.getFormValues(EditRouteSelectors.form).Days6 ? 1 : 0) + "'";
			
	//logMessage('DEBUG', JSON.stringify(flightDataObj));
	
	flightDataObj.days = (this.getFormValues(EditRouteSelectors.form).Days0 ? '1' : '-') +
			   (this.getFormValues(EditRouteSelectors.form).Days1 ? '2' : '-') +
			   (this.getFormValues(EditRouteSelectors.form).Days2 ? '3' : '-') +
			   (this.getFormValues(EditRouteSelectors.form).Days3 ? '4' : '-') +
			   (this.getFormValues(EditRouteSelectors.form).Days4 ? '5' : '-') +
			   (this.getFormValues(EditRouteSelectors.form).Days5 ? '6' : '-') +
			   (this.getFormValues(EditRouteSelectors.form).Days6 ? '7' : '-');

	return flightDataObj;
};