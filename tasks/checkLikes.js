var Config = require('nconf');
Config = require('nconf');
Config.argv()
		.env()
		.file({ file: 'config.json' });
var instagram = require('instagram-node').instagram();
var apn = require('apn');
var mongoose = require('mongoose');
var request = require('request');
var models = require('../models');
var connection = mongoose.createConnection(Config.get("Db_CONNECTION_STRING"));
connection.on('error', console.error.bind(console,'connection error:'));
connection.once('open', function () { console.info('connected to database') });
var db = {
	User: connection.model('User', models.User, 'users'),
	Media: connection.model('Media', models.Media, 'medias'),
	Like: connection.model('Like', models.Like, 'likes')
}
setInterval(function(){
	console.log('starting new run of task');
	db.User
	.find({ $or: [ { type: "buyer" }, { type: "both" } ], buyerToken: { $exists: true } })
	.sort({'lastQueried': 'asc'})
	.limit(Config.get("USERS_PER_WORKER_RUN"))
	.exec(function(err, users) {
		users.forEach(function(user){
			instagram.use({ access_token: user.buyerToken });
			instagram.user_self_liked({ count:Config.get("WORKER_RUN_INTERVAL_SECONDS")/*assume users do one like persecond*/ },
			function(err, medias, pagination, remaining, limit) {
				console.log(user.username + " has " + remaining + " remaining insta calls left out of " + limit);
				if(!err){
					console.log("most recent likes for " + user.username + ":");
					console.log(medias);
					user.lastQueried = Date.now();
					user.save();
					if(medias.length){
 						var allMediaInstaIds = medias.map(function(value){ return value.id; });
						db.Media.find({instaId: { $in: allMediaInstaIds }, isMatchedWithProduct : true } , function (err, mediasFromDB) {
							//gettting what we should exclude
							if(!err){
								console.log("recent likes for user " + user.username + " that is in our db");
								console.log(mediasFromDB);
								db.Like.find( {media: { $in: mediasFromDB}, likedBy:user }, function(err, likesToExclude){
									if(!err){
										var mediaIdsToExclude = likesToExclude.map(function(value){ return value.media.toString()})
										console.log("likes (instaIds) to exclude for user " + user.username);
										console.log(mediaIdsToExclude);
				 						mediasFromDB.forEach(function(media){
				 							if(mediaIdsToExclude.indexOf(media._id.toString())>=0){
				 								return;
				 							} else {

												//storing the like
    			     							db.Like.findOrCreate({likedBy: user, media: media}, {likedDate: Date.now()}, function(err, toBeSavedLike, created) {
    			     								if(!err){
    			     									// for concurrency
    			     									if(!created) {
    			     										return;
    			     									}
    			     									toBeSavedLike.save();
    			     								} else {
    			     									console.log(err);
    			     									return;
    			     								}
    			     							});

						  			    		//android devices
				     							if(user.buyerRegisterationIds.androidIds && user.buyerRegisterationIds.androidIds.length){
				     								request(
				     								{
				     									uri: Config.get("GCM_SEND_URL"),
				     									method: "POST",
				     									headers: {Authorization:("key="+Config.get("BUYER_GCM_API_KEY"))},
				     									json: {
				     										"registration_ids" : user.buyerRegisterationIds.androidIds,
				     										"data" : {
				     											imageUrl: media.images.low_resolution.url,
				     											text: media.productDescription || "The photo you just liked has more infromation",
				     											postId: media._id
				     										}
				     									}
				     								},
				     								function (error, response, body) {
				     									if (!error && response.statusCode == 200 && body.success > 0 /*at least one device got it*/) {
			    			     							//Saving likes to db
			    			     							console.log(body);
			    			     							console.log("Remaining api calls per hour for this user: " + remaining);
			    			     							if(body.canonical_ids) {
			    			     								body.results.forEach(function(value,index){
			    			     									if(value.registration_id){
			    			     										user.buyerRegisterationIds.androidIds.splice(index, 1);
			    			     										user.buyerRegisterationIds.androidIds.push(value.registration_id);
			    			     									}	
			    			     								});
			    			     								user.save();
			    			     							}
			    			     						} else {
							     							if(body.failure > 0){
							     								body.results.forEach(function(value,index){
							     									if(value.error == 'NotRegistered'){
							     										user.buyerRegisterationIds.androidIds.splice(index, 1);
							     									}	
							     								});
							     								user.save();	     								
							     							}
			    			     							console.log("BODY:");
			    			     							console.log(body);
			    			     							console.log("ERROR:");
			    			     							console.log(error);
			    			     						}
			    			     					});			     								
												}
					  			    			//ios devices
						  			    		if(user.buyerRegisterationIds.iosIds && user.buyerRegisterationIds.iosIds.length){
						  			    			var options = { 
						  			    				cert: 'buyerApnCert.pem',
						  			    				key: 'buyerApnKey.pem'
						  			    			};
													var apnConnection = new apn.Connection(options);

													user.buyerRegisterationIds.iosIds.forEach(function(regId){
														var myDevice = new apn.Device(regId);

														var note = new apn.Notification();

														note.expiry = Math.floor(Date.now() / 1000) + 60; // Expires 1 min from now.
														note.badge = 1;
														note.sound = "";
														note.alert = media.productDescription  || "The photo you just liked has more infromation";
														note.payload = {'postId': media._id};

														apnConnection.pushNotification(note, myDevice);									
													});
													
													// sending dev notificaitons
													if(Config.get("SEND_DEV_APN_NOTIFICATION")){
														var devOptions = { 
							  			    				cert: 'devBuyerApnCert.pem',
							  			    				key: 'devBuyerApnKey.pem'
							  			    			};
														ver devApnConnection = new apn.Connection(devOptions);

														adminUser.merchantRegisterationIds.iosIds.forEach(function(regId){
															var myDevice = new apn.Device(regId);

															var note = new apn.Notification();

															note.expiry = Math.floor(Date.now() / 1000) + 60; // Expires 1 min from now.
															note.badge = 1;
															note.sound = "";
															note.alert = media.productDescription  || "The photo you just liked has more infromation";
															note.payload = {'postId': media._id};

															devApnConnection.pushNotification(note, myDevice);									
														});
													}
												}
				 							}
										});
									} else {
										console.log(err);
									}
								});								
							}else{
								console.log(err);						
							}
						});
					}
				} else {
					console.log(err);
					if(err.code == 400){
						console.log("removing token");
						user.buyerToken = undefined;
						user.save();
					}
 			 	}
 			});
		});
	});
}, Config.get("WORKER_RUN_INTERVAL_SECONDS")*1000);
