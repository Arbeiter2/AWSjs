/*
selectors.js
*/


var LoginSelectors = 
{
'gameTour' : '#headerContent2 > ul:nth-child(1) > li:nth-child(3) > a:nth-child(1)',
'loginSubmit' : x('//*[@id="submitBtn"]'),
'loginForm' : 'form#frmLogin',

'gameImage_pattern' : '#gamedata%GAME_ID% > img:nth-child(1)',
'continueGameBtn_pattern' : '#form%GAME_ID% > input:nth-child(4)',
};

var MenuSelectors = 
{
	'baseLinks': '#statusBarAirline > a'
};

var ManageRouteSelectors =
{
	'routeRows'	: '#routeviewSel2',
	'copyRouteLinks'	: 'tr[id^="rData"] > td.BgNr.actionButtons1b > div:nth-child(2) > a.flLeft.routeManageIconAdd',
	'flightDays'	: x('//*[starts-with(@id, "rData")]/td[2]/table/tbody/tr[3]/td'),
	'outboundTimes' : x('//*[starts-with(@id, "rData")]/td[2]/table/tbody/tr[1]/td[2]'),
	'assignedAircraftCell'	: 'tr[id^="rData"] > td:nth-last-child(3)',
	'assignedAircraft'	: 'tr[id^="rData"] > td:nth-last-child(3) > a:nth-child(1)',
	'functionSelect' : x('//*[@id="multifunc"]'),
	
	'aircraftTooltip' : '[id^="tooltip_ac"] > div > div > div.tooltip_content',
	
	'loadingSpinner' : '#loadingAnimation',
	'currentPage' : x('//*[@id="routeData"]/div[2]/div[2]/span'),

	'viewRouteLinks'	: x('//*[starts-with(@id, "rData")]/td[1]/a[1]'),
	'editRouteLinks'	: 'tr[id^="rData"] > td.BgNr.actionButtons1b > div:nth-child(1) > a.flLeft.routeManageIconEdit',
	
	'routeForm' : '#routeForm',

	'pageSelector' :  x('//*[@id="routeForm"]/div[2]/select'), 
	'nextPage'	: x('//*[@id="routeData"]/div[2]/div[3]/button'),
	
	'base'	: x('//*[starts-with(@id, "rData")]/td[2]/table/tbody/tr[1]/td[1]/a[1]'),
	'destination'	: x('//*[starts-with(@id, "rData")]/td[2]/table/tbody/tr[1]/td[1]/a[2]'),
};

var ViewRouteSelectors = 
{
	'flightDays'	: x('//*[@id="routeData"]/div[2]/table/thead/tr[3]/td[1]/table/tbody/tr[1]/td[4]'),
	//'assignedAircraftLink'	: x('//*[@id="assignedPlaneInfo"]')
};

var CreateRouteSelectors = 
{
	'confirmBtn': '#routeConfirmAreaButton > input[type="submit"]'
};

var EditRouteSelectors =
{
	'form'	: 'form#routeEditorForm',
	'base'		: '#routeEditorArea > div.borderOuter > div.borderInner.smallDataBox > table > thead > tr:nth-child(1) > td > table > thead > tr:nth-child(1) > td.Bg > span > a',
	//'base'		: x('//*[@class="listingTable"]/thead/tr[1]/td/table/thead/tr[1]/td[2]/span/a'),
	'destination'	:  '#routeEditorArea > div.borderOuter > div.borderInner.smallDataBox > table > thead > tr:nth-child(1) > td > table > thead > tr:nth-child(2) > td.Bg > span.Fade > a',
	//'destination'	: x('//*[@class="listingTable"]/thead/tr[1]/td/table/thead/tr/td[contains(text(), "Destination")]/../td[2]/span/a'),
	'sector_airports' : '#routeEditorArea > div.borderOuter > div.borderInner.smallDataBox > table > thead > tr:nth-child(1) > td > table > thead > tr > td.Bg > span > a',
	'sector_distances' : '#routeEditorArea > div.borderOuter > div.borderInner.smallDataBox > table > thead > tr:nth-child(1) > td > table > thead > tr > td.BgNr.alCenter',
	'sector_lengths' : x('//*[contains(text(),"Total scheduled flight time:")]/following-sibling::td'),
	
	'outbound_dep_HH'	: '#Dep1H',
	'outbound_dep_MM'	: '#Dep1M',
	'outbound_arr_tm'	: x('//*[@class="listingTable"]/thead/tr[7]/td[2]/table/tbody/tr[3]/td[2]'),
	'outbound_flt_tm'	: x('//*[@class="listingTable"]/thead/tr[7]/td[2]/table/tbody/tr[1]/td[2]'),

	'inbound_dep_tm'	: x('//*[@class="listingTable"]/thead/tr[9]/td[2]/table/tbody/tr[2]/td[2]'),
	'inbound_arr_tm'	: x('//*[@class="listingTable"]/thead/tr[9]/td[2]/table/tbody/tr[3]/td[2]'),
	'inbound_flt_tm'	: x('//*[@class="listingTable"]/thead/tr[9]/td[2]/table/tbody/tr[1]/td[2]'),
	'turnaround_mins'	: '#Turn1',
	'min_turnaround_mins' : '#Turn1 > option:nth-child(2)',
	'errorText'	: '#routeEditorArea > center > div > div.Text > ul > li',

	//'distance'	: '#routeEditorArea > div.borderOuter > div.borderInner.smallDataBox > table > thead > tr:nth-child(1) > td > table > thead > tr:nth-child(1) > td.BgNr.alCenter',
	'distance'	: x('//*[@class="listingTable"]/thead/tr[1]/td/table/thead/tr/td[@class="BgNr alCenter"]'),
	'fleetCode'	: '#FleetID',
	'flightNumber'	: '#Number',
	'airlineCode': x('//*[@id="fltNum2Area"]'),
	'noSlots1' : '#noSlots1',
	'noSlots2' : '#noSlots2',

	'PriceReset'	: x('//*[@class="listingTable"]/thead/tr[13]/td[2]/div/a[3]'),
	/*
	'base'		: '#routeEditorArea > div.borderOuter > div.borderInner.smallDataBox > table > thead > tr:nth-child(1) > td > table > thead > tr:nth-child(1) > td.Bg > span > a',
	//'base'		: x('//*[@id="routeEditorArea"]/div[1]/div[2]/table/thead/tr[1]/td/table/thead/tr[1]/td[2]/span/a'),
	'destination'	:  '#routeEditorArea > div.borderOuter > div.borderInner.smallDataBox > table > thead > tr:nth-child(1) > td > table > thead > tr:nth-child(2) > td.Bg > span.Fade > a',
	//'destination'	: x('//*[@id="routeEditorArea"]/div[1]/div[2]/table/thead/tr[1]/td/table/thead/tr/td[contains(text(), "Destination")]/../td[2]/span/a'),
	'sector_airports' : '#routeEditorArea > div.borderOuter > div.borderInner.smallDataBox > table > thead > tr:nth-child(1) > td > table > thead > tr > td.Bg > span > a',
	'sector_distances' : '#routeEditorArea > div.borderOuter > div.borderInner.smallDataBox > table > thead > tr:nth-child(1) > td > table > thead > tr > td.BgNr.alCenter',
	'sector_lengths' : x('//*[contains(text(),"Total scheduled flight time:")]/following-sibling::td'),
	
	'outbound_dep_HH'	: '#Dep1H',
	'outbound_dep_MM'	: '#Dep1M',
	'outbound_arr_tm'	: x('//*[@id="routeEditorArea"]/div[1]/div[2]/table/thead/tr[7]/td[2]/table/tbody/tr[3]/td[2]'),
	'outbound_flt_tm'	: x('//*[@id="routeEditorArea"]/div[1]/div[2]/table/thead/tr[7]/td[2]/table/tbody/tr[1]/td[2]'),

	'inbound_dep_tm'	: x('//*[@id="routeEditorArea"]/div[1]/div[2]/table/thead/tr[9]/td[2]/table/tbody/tr[2]/td[2]'),
	'inbound_arr_tm'	: x('//*[@id="routeEditorArea"]/div[1]/div[2]/table/thead/tr[9]/td[2]/table/tbody/tr[3]/td[2]'),
	'inbound_flt_tm'	: x('//*[@id="routeEditorArea"]/div[1]/div[2]/table/thead/tr[9]/td[2]/table/tbody/tr[1]/td[2]'),
	'turnaround_mins'	: '#Turn1',
	'min_turnaround_mins' : '#Turn1 > option:nth-child(2)',
	'errorText'	: '#routeEditorArea > center > div > div.Text > ul > li',

	//'distance'	: '#routeEditorArea > div.borderOuter > div.borderInner.smallDataBox > table > thead > tr:nth-child(1) > td > table > thead > tr:nth-child(1) > td.BgNr.alCenter',
	'distance'	: x('//*[@id="routeEditorArea"]/div[1]/div[2]/table/thead/tr[1]/td/table/thead/tr/td[@class="BgNr alCenter"]'),
	'fleetCode'	: '#FleetID',
	'flightNumber'	: '#Number',
	'airlineCode': x('//*[@id="fltNum2Area"]'),
	'noSlots1' : '#noSlots1',
	'noSlots2' : '#noSlots2',

	'PriceReset'	: x('//*[@id="routeEditorArea"]/div[1]/div[2]/table/thead/tr[13]/td[2]/a[3]'),*/
	'confirm'		: '#confBtn',
	'cancel'		: '[class="resetBtn"]',
	
	'updatedRoute'	: x('//*[@class="flLeft routeManageIconEdit"]'),
	//'routeSuccessMessage' : x('//*[@id="routeEditorArea"]/center/div')
	'routeSuccessMessage' : '#routeEditorArea > div.Msg > div.Text',
	'routeErrorMessages' : '#routeEditorArea > div.Error > div.Text > ul'
};

var ViewAircraftSelectors = 
{
	'functionSelect' : x('//*[@id="multifunc"]'),
	'viewACLinks'	: x('//tr[starts-with(@id, "aData")]/td[9]/div[1]/a[1]'),
	'pageSelector' :  x('//*[@id="aircraftForm"]/div[1]/select'),
	'currentPage' : '#aircraftData > div.listingTableButtons > div.listingPages > span',
	'nextPage'	: x('//*[@id="aircraftData"]/div[2]/div[3]/button'),
	'viewACSchedule'	: '[id^="aData"] > td.BgNr.actionButtons2 > div.actionButtons3 > a.flLeft.aircraftManageIconSchedule',
	'aircraft_reg'	: '[id^="currReg"]',

	'fleetTypeDescription'	: '#aircraftData > table > tbody > tr:nth-child(3) > td:nth-child(2) > a',
	'model'	: '#aircraftData > table > tbody > tr:nth-child(4) > td.Bg1',
	'msnLink'	: '#aircraftData > table > tbody > tr:nth-child(6) > td.Bg1 > a',
	'registrationLink'	: 'a[id^="currReg"]',
	'baseAirportLink'	: x('//*[@id="aircraftData"]/table/tbody/tr[10]/td[2]/a[2]'),
	'boozer'	: x('//div[starts-with(@id, "Model")]'),
	'fleetLink'	: 'a[href*="filterFleet"]',

	'ownership'	: '#aircraftData > table > tbody > tr:nth-child(14) > td:nth-child(2)',
	'leaseOrBookValue'	: '#aircraftData > table > tbody > tr:nth-child(15) > td:nth-child(2) a.flLeft.aircraftManageIcon1', // conditional on ownership.match(/Leased/)
	'engines'	: x('//*[@id="aircraftData"]/table/tbody/tr[22]/td[2]'),
	'seats'	: x("//td[contains(text(),'Seating configuration')]/following-sibling::*[1]"),
	'variant'	:  x('//*[@id="aircraftData"]/table/tbody/tr[24]/td[2]'),
	'dateConstructed'	: x('//*[@id="aircraftData"]/table/tbody/tr[20]/td[2]'),
};

var ScheduleSelectors = 
{
	'addFlightsBtn'	: x('//*[@class="flLeft routeScheduleIconAdd"]'),
	'addFlightsForm'	: '#dialogAddFlight > form',
	//'pattern_flightSelectCheck'	:	'div[id="dialogAddRouteArea"] > div > div > label > input[id="avlbRoutes%ID%chk"]',

	'pattern_flightSelectCheck'	:	'input[name="avlbRoutes%ID%chk"]',
	
	'routeError'	: '#routeErrorMsgText',
	'submitFlightsBtn'	: x('//*[@id="addOKbtn"]'),
	'routesAdded'	: '#routeAddFlightMsg',
	'addFlightsForm2': '#routeData > form:nth-child(3)',
	
	'maintenanceText'	: 'div[id^="tooltip_chkA"]', 	
	'addMaintenanceBtn'	: 'a[title="Set maintenance"]',
	'addMaintenanceForm'	: '#dialogAddMaint > form',

	'maintenanceSubmitBtn'	: x('//*[@id="maintOKbtn"]'),
	'registrationLink'	: x('//a[starts-with(@id="currReg")]'),
	
	'loadingSpinner' : '#loadingAnimation',
	'scheduleNotEmpty' : 'td[class^="scheduleDayArea"] > div[class="scheduleFlight awsTooltip"]',
	
	'baseAirport' : '#routeForm > table > thead > tr:nth-child(2) > td.Title3.left.Small2',
	
	'pattern_maintenanceADay'	: '#dialogAddMaintADay%DAY%',
	'maintenanceADay'	: 'dialogAddMaintADay',
	'maintenanceAHour'	: 'dialogAddMaintADepH',
	'maintenanceAMinute'	: 'dialogAddMaintADepM',	
    'maintenanceANow'	: 'dialogAddMaintAnow',
	'pattern_maintenanceBDay'	: '#dialogAddMaintBDay%DAY%',
    'maintenanceBHour'	: 'dialogAddMaintBDepH',
    'maintenanceBMinute'	: 'dialogAddMaintBDepM',
    'maintenanceBNow'	: 'dialogAddMaintBnow',
	'maintenanceSameForB'	: 'dialogAddMaintBsame',
	'maintenanceAdded'	: '#routeSetMaintMsg',	
	
	'timetableEntry'	: 'td[class="scheduleDayArea"] > div[id$="_1"]',
	'tooltip_base'	: 'div > div > div.tooltip_content > table > thead > tr:nth-child(2) > td.Bg > span > a',
	'tooltip_dest'	: ' > div > div > div.tooltip_content > table > thead > tr:nth-child(3) > td.Bg > span > a',
	'tooltip_flight_number'	: ' > div > div > div.tooltip_content > table > thead > tr:nth-child(1) > td > b',
	'tooltip_earliest_dep'	: ' > div > div > div.tooltip_content > table > thead > tr > td[colspan="2"]:nth-child(1)', 
	'tooltip_start_day'	: ' > div > div > div.tooltip_content > table > thead > tr:nth-child(4) > td:nth-child(2)',
	'tooltip_chkA_time'	: ' > div > div > div.tooltip_content > div > div',
	'tooltip_changeReg'	: 'a[onclick^="setRegistration"]',
	'ac_tooltip'	: '[id^=tooltip_ac] > div > div > div.tooltip_content > div'
};