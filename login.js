/*
login.js
*/
phantom.injectJs( 'casperCookies.js' );
var cookieFile = "awsCookies.txt";


var loginTimeout = 30000;

logMessage('DEBUG', "Starting login");
/*
    go to the login link
*/
casper.start('https://www.airwaysim.com/', function() {

    //this.loadCookies(cookieFile);
	//this.waitForText('CONTACT US', 
	this.waitForSelector('#contentUpperLogin',
		function opened() {}, 
		
		function timeout() 
		{
			this.capture(tempDir + '/error.jpg');
			this.echo(this.getHTML());

			logMessage('FAIL', "Timed out opening front page"); this.exit(1); 
		} , 
		
		15000
	);
	/*
	if (!this.exists(LoginSelectors.gameTour))
	{			this.capture('/home/delano//error.jpg');

		logMessage('FAIL', 'Unable to locate link on page!');
		this.exit(1);
	}
	this.click(LoginSelectors.gameTour);*/
});

casper.thenOpen('https://www.airwaysim.com/Login/', function() {
	logMessage('INFO', "Logging in to AWS");
	
	this.waitForSelector(LoginSelectors.loginSubmit,
	function doLogin() 
	{
		this.fill(LoginSelectors.loginForm, {
		'user' : 		'DmlrBnz',
		'passwrd' : 	'mor1bund',
	//	'hash_passwrd':	'',
		'phase':		'2',
		'publicLogin':	false
		}, false);
		
	
		this.click(LoginSelectors.loginSubmit);

		logMessage('INFO', 'Sending login details');
		this.wait(1000);
		this.capture("C:/tmp/junk.jpg")
	},

	function checkLogin()
	{
		if (this.getHTML().match(/already logged in/))
		{
			logMessage('PASS', 'Already logged in.');
			//this.capture('/tmp/already.jpg');
		}
		else
		{
			logMessage('FAIL', 'Login failed.');
			//this.capture('/tmp/failed.jpg');
			casper.exit(0);
		}
	},
	
	loginTimeout);
});

casper.then(function() { this.saveCookies(cookieFile); });



var gameName = "";
var gameImage = LoginSelectors.gameImage_pattern.replace('%GAME_ID%', gameID);
var continueGameBtn = LoginSelectors.continueGameBtn_pattern.replace('%GAME_ID%', gameID);
//casper.thenClick('#Game_area', function()
//{
//	console.log(this.getCurrentUrl());
//});
casper.then(function() {

//casper.thenOpen('http://www.airwaysim.com/game/', function() {
	//console.log(this.getCurrentUrl());
	//console.log(this.getTitle());
	//this.capture('/tmp/intermediate.jpg');

	this.waitForText('Continue game', function() {

	if (!this.getCurrentUrl().match(/NewsOverview/)
	&&  !this.getTitle().match(/Dashboard.+Airline news/))
	{
//		console.log("Waiting for ["+continueGameBtn+"]");
		casper.waitForSelector(continueGameBtn,
		function gameFound() {
			gameName = this.getElementAttribute(gameImage, 'alt');

			// we must be continuing a game, not starting one by accident
			if (!this.getElementAttribute(continueGameBtn, 'title').match(/Continue game/))
			{
				logMessage('FAIL', 'Game ' + gameID + ' (' + gameName + ') not running.');
//				this.capture(tempDir + '/error.jpg');
				casper.exit(1);
			}
		},

		function noGame() {
			{
				logMessage('FAIL', 'Game ' + gameID + " not found after " + loginTimeout + "ms.");
//				this.capture('c:/tmp/error.jpg');
				casper.exit(1);
			}
		},
		
		loginTimeout);

		casper.thenClick(continueGameBtn, function() {
			casper.waitForSelector('#Aircraft');
			logMessage('PASS', 'Game ' + gameID + ' (' + gameName + ') found');
		});
	}
},

function missingContinue() { console.log("No 'Continue game' detected"); this.capture('c:/tmp/error.jpg'); },

10000
);

});

