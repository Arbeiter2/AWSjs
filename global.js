//var casper = require('casper').create({ verbose: true, logLevel: 'debug' });
//var casper = require('casper').create({ logging: 'error', pageSettings: { webSecurityEnabled: false } })t;

var prefs = {
    pageSettings: {
		userAgent: "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36",
		webSecurityEnabled: false 
	}
};

var verbose = false;
if (verbose)
{
	prefs['verbose'] = true;
	prefs['logLevel'] = 'debug';
}
else
{
	prefs['logging'] = 'error';
}
var casper = require('casper').create(prefs);


var system = require('system');
var argv = system.args;
var os = system.os;

var tempDir = (os.name == 'linux' ? '/tmp/' : 'c:\\tmp\\');


var requiredArgs = [ "--game_id=<id>\tID number of AWS game", "[--html]\toutput HTML instead of plain text" ];

var htmlOutput = false;
var jsonOutput = false;
var silent = false;

function linkReplacer(match, p1, offset, string){
  return "<a href='" + match + "' target='_blank'>" + match + "</a>";
}

function linkReplacer2(match, p1, p2, offset, string){
  return "<a href='" + p2 + "' target='_blank'>" + p1 + "</a>";
}

function linkReplacer3(match, p1, p2, offset, string){
  return p2;
}


function logHTML(text)
{
	if (htmlOutput)
	{
		console.log(text);
	}
}


function cellBuilder(text)
{
	retVal = "";
	out = "";
	waiting = true;
	colspan = 0;

	for (i=0; i < text.length; i++)
	{
		if (text[i] == "\t")
		{
			if (out.length > 0)
			{
				retVal += out + "</td>";
				out = "";
			}
			waiting = true;
			colspan++;
		}
		else
		{
			if (waiting)
			{
                retVal += "<td" + (colspan > 1 ? ' colspan=' + colspan : '') + ">";
				colspan = 0;
				waiting = false;
			}
			out += text[i];
		}
	}
    retVal += out + (colspan > 0 ? "<td colspan=" + colspan + ">" : "") + "</td>";
	return retVal;
}


function logMessage(type, text)
{
	var out = "";
	var colorCode;
	var htmlColor;
	
	if (silent && (type != 'ERROR' || type != 'FAIL' || type != 'TIMEOUT'))
		return;
	
	switch(type)
	{
		case 'ERROR':
		case 'FAIL':
		case 'TIMEOUT':
			colorCode = 31;
			htmlColor = 'red';
			break;
		case 'DEBUG':
		case 'INFO':
			colorCode = 30;
			htmlColor = 'grey';
			break;
		default:
			colorCode = 32;
			htmlColor = 'green';	
			break;
	};
	
	if (htmlOutput)
	{
		var re2 = /@([^@]+)@,(\w+:\/\/\S+)/g;
		var re = /(?=\w+:\/\/)\S+/g;

		if (text.match(re2))
		{
			text = text.replace(re2, linkReplacer2);
		}
		else if (text.match(re))
		{
			text = text.replace(re, linkReplacer);
		}
		
		// if the incoming text contains tabs it is a table row
		if (text.match(/\t/g))
		{
			//var t = text.replace(/\t/g, "</td><td>");
			var t = cellBuilder(text);
			out = "<tr><td><span class='ugly " + htmlColor + "'>" + type + "</span></td>";
			out += t;
			out += "</tr>";
		}
		else
		{
			out = "<span class='ugly " + htmlColor + "'>" + type + "</span>&nbsp;" + text + "<br />";
		}
	}
	else
	{
		text = text.replace(/@([^@]+)@,/, "$1\t");
		
		if (os.name == 'linux')
			out = out + "[" + colorCode + ";1m" + type + "[0m " + text;
		else
			out = out + type + " " + text;

	}
	
	if (!silent)
		console.log(out);
}

if (casper.cli.has('html'))
{
	htmlOutput = true;
}

if (casper.cli.has('silent'))
{
	silent = true;
}

// game number can be obtained from main game page
if (!casper.cli.has('game_id'))
{
    logMessage('ERROR', 'parameter --game_id required');
	casper.exit(1);
}
var gameID = casper.cli.get("game_id");
logMessage('INFO', 'gameID = ' + gameID);



casper.viewportSize = {width: 1024, height: 768};

// used everywhere 
var x = require('casper').selectXPath;

var weekDayNumbers = {
'Mo' : 1,
'Tu' : 2,
'We' : 3,
'Th' : 4,
'Fr' : 5,
'Sa' : 6,
'Su' : 7,
};

var weekNumberDays = {
'1' : 'Mo',
'2' : 'Tu',
'3' : 'We',
'4' : 'Th',
'5' : 'Fr',
'6' : 'Sa',
'7' : 'Su',
};



String.prototype.repeat = function(count) 
{
	if (count < 1) return '';
	var result = '', pattern = this.valueOf();
	while (count > 1) {
	  if (count & 1) result += pattern;
	  count >>>= 1, pattern += pattern;
	}
	return result + pattern;
};

