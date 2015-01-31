var CronJob = require('cron').CronJob;
var Config = require('nconf');
Config = require('nconf');
Config.argv()
     .env()
     .file({ file: 'config.json' });

new CronJob('* * * * * *', function(){
    console.log('strting new task - (scheduled every second)');
	request('http://www.google.com', function (error, response, body) {
	  if (!error && response.statusCode == 200) {
	    console.log(body) // Show the HTML for the Google homepage.
	  }
	});
}, null, true, "America/Los_Angeles");