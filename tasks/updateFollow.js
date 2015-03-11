var Config = require('nconf');
Config = require('nconf');
Config.argv()
		.env()
		.file({ file: 'config.json' });
var instagram = require('instagram-node').instagram();
var mongoose = require('mongoose');
var models = require('../models');
var connection = mongoose.createConnection(Config.get("Db_CONNECTION_STRING"));
connection.on('error', console.error.bind(console,'connection error:'));
connection.once('open', function () { console.info('connected to database') });
var db = {
	User: connection.model('User', models.User, 'users'),
}
setInterval(function(){
	// console.log('starting new run of task');
	db.User
	.find({ $or: [ { type: "buyer" }, { type: "both" } ], buyerToken: { $exists: true } })
	.sort({'lastQueriedForFollowers': 'asc'})
	.limit(Config.get("USERS_PER_WORKER_RUN"))
	.exec(function(err, users) {
		users.forEach(function(user){
			instagram.use({ access_token: user.buyerToken });
			instagram.user_follows(user.instaId, function(err, follows, pagination, remaining, limit) {
				// console.log(user.username + " has " + remaining + " remaining insta calls left out of " + limit);
				if(!err){
					// console.log("most recent follows for " + user.username + ":");
					// console.log(follows);
					user.lastQueriedForFollowers = Date.now();
					user.save();
					if(!user.followsInstaIds) {
						user.followsInstaIds = [];
					}
					if(user.username === 'srmehr'){
						debugger;
					}
					follows.forEach(function(newFollow){
						debugger;
						if (user.followsInstaIds.indexOf(""+newFollow.id) >= 0 ){
							return;
						}
						user.followsInstaIds.push(""+newFollow.id);
					});
					user.save();
				} else {
					console.log(err);
					if(err.code == 400){
						// console.log("removing token");
						user.buyerToken = undefined;
						user.save();
					}
 			 	}
 			});
		});
	});
}, Config.get("UPDATE_FOLLOW_RUN_INTERVAL_SECONDS")*1000);
