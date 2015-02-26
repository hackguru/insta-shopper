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
	User: connection.model('User', models.User, 'users')
}
setInterval(function(){
	console.log('starting new run of updating unregistered brands posts');
	db.User
	.find({ $or: [ { type: "merchant" }, { type: "both" } ], $or:[{merchantToken: {$exists:false}}, {merchantToken: null}, {merchantToken: ""}], $and:[{username: {$exists:true}}, {username: {$ne:null}}, {username: {$ne:""}}] })
	.exec(function(err, users) {
		users.forEach(function(user){
			console.log(user);
		});
	});
}, Config.get("GET_UNREGISTERED_MERCHANTS_POSTS_RUN_INTERVAL_SECONDS")*1000);
