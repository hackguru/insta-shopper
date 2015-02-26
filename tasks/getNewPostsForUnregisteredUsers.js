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
	Media: connection.model('Media', models.Media, 'medias')
}
setInterval(function(){
	console.log('starting new run of updating unregistered brands posts');
	db.User
	.find({ $and:[
		{$or:[ { type: "merchant" }, { type: "both" } ]},
		{$or:[{merchantToken: {$exists:false}}, {merchantToken: null}, {merchantToken: ""}]},
		{username: {$exists:true}},
		{username: {$ne:null}},
		{username: {$ne:""}}
	]})
	.exec(function(err, users) {
		users.forEach(function(user){
			db.Media.find({owner : user})
						.sort({'created': 'desc'})
						.limit(1)
						.exec(function(err, medias) {
							if(!err){
								var lastId = medias[0] ? medias[0].instaId : undefined;
								// GET A RANOM TOKEN
								var filter = {
									$or:[
										{ $and:[{merchantToken: {$exists:true}}, {merchantToken: {$ne:null}}, {merchantToken: {$ne:""}}] },
										{ $and:[{buyerToken: {$exists:true}}, {buyerToken: {$ne:null}}, {buyerToken: {$ne:""}}] }
									]
								}
								var fields = {merchantToken:1, buyerToken:1};
								var options = { limit: 1 }
								db.User.findRandom(filter, fields, options, function (err, userWithToken) {
									userWithToken = userWithToken[0];
									if(!err && userWithToken){
										var token;
										if(userWithToken.buyerToken){
											token = userWithToken.buyerToken;
										} else {
											token = userWithToken.merchantToken;
										}
										instagram.use({ access_token: token });
										var instaOptions = {};
										if (lastId){
											instaOptions.min_id= lastId;
										}
										instagram.user_media_recent(user.instaId, instaOptions, function(err, medias, pagination, remaining, limit) {
											medias.forEach(function(media){
												var newMedia = {
													caption: media.caption ? media.caption.text : null,
													instaId: media.id,
													owner: user,
													videos: media.videos ? media.videos : null,
													images: media.images ? media.images : null,
													link : media.link,
													type: media.type
												};
								  			    db.Media.findOrCreate({instaId: media.id}, newMedia, function(err, toBeSavedMedia) {
								  			    	if(!err){
								  			    		toBeSavedMedia.save();
								  			    		console.log("Added new media");
								  			    		console.log(toBeSavedMedia);
								  			    	}
												});
											});
										});
									}
								});
							}
						});

		});
	});
}, Config.get("GET_UNREGISTERED_MERCHANTS_POSTS_RUN_INTERVAL_SECONDS")*1000);
