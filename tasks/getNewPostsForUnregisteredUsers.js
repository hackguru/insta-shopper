var Config = require('nconf');
Config = require('nconf');
Config.argv()
		.env()
		.file({ file: 'config.json' });
var instagram = require('instagram-node').instagram();
var mongoose = require('mongoose');
var apn = require('apn');
var request = require('request');
var models = require('../models');
var instaShopperUtils = require('../utils/instaShopperUtils.js');
var connection = mongoose.createConnection(Config.get("Db_CONNECTION_STRING"));
connection.on('error', console.error.bind(console,'connection error:'));
connection.once('open', function () { console.info('connected to database') });
var db = {
	User: connection.model('User', models.User, 'users'),
	Media: connection.model('Media', models.Media, 'medias')
}
setInterval(function(){
	// console.log('starting new run of updating unregistered brands posts');
	db.User
	.find({ isAdminManaged: true }, function(err, users) {
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
											if(medias && medias.length){
												medias.reverse();
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
									  			    db.Media.findOrCreate({instaId: media.id}, newMedia, function(err, toBeSavedMedia, created) {
									  			    	if(!err){
									  			    		if(created){
										  			    		toBeSavedMedia.save();
										  			    		// console.log("Added new media");
										  			    		// console.log(toBeSavedMedia);

										  			    		// push notification to admins

										  			    		if(user.website.indexOf('like2b.uy') >= 0){
											  			    		instaShopperUtils.findLinkInLikeToBuy(user.username,media.id,function(result){
											  			    			if(result != null){
																			toBeSavedMedia.linkToProduct = result;
																			toBeSavedMedia.isMatchedWithProduct = true;
																			toBeSavedMedia.save();
																			instaShopperUtils.getMobileScreenShot(result,function(ssUrl){
																				if(ssUrl != null){
																				  	toBeSavedMedia.productLinkScreenshot = ssUrl;
																				  	toBeSavedMedia.save();
																				}
																			});
																		}
																	});
										  			    		} else {
											  			    		db.User.find({isAdmin: true}, function(err,users){
											  			    			if(!err && users && users.length){
											  			    				users.forEach(function(adminUser){
														  			    		//android devices
														  			    		if(adminUser.merchantRegisterationIds.androidIds && adminUser.merchantRegisterationIds.androidIds.length){
																					request(
																					{
																						uri: Config.get("GCM_SEND_URL"),
																						method: "POST",
																						headers: {Authorization:("key="+Config.get("MERCHANT_GCM_API_KEY"))},
																						json: {
																						  "registration_ids" : adminUser.merchantRegisterationIds.androidIds,
																						  "data" : {
																						   	imageUrl: toBeSavedMedia.images.low_resolution.url,
																						   	text: user.username + " posted new insta! Match it up!",
																						   	postId: toBeSavedMedia._id
																						  }
																						}
																					},
																					function (error, response, body) {
																					  if (!error && response.statusCode == 200 && body.success > 0 /*at least one device got it*/) {
																					    // console.log(body);
																					    //TODO: refactor this between two apis
														     							if(body.canonical_ids) {
														     								body.results.forEach(function(value,index){
														     									if(value.registration_id){
														     										adminUser.merchantRegisterationIds.androidIds.splice(index, 1);
														     										adminUser.merchantRegisterationIds.androidIds.push(value.registration_id);
														     									}	
														     								});
														     								adminUser.save();
														     							}
																					  } else {
														     							if(body.failure > 0){
														     								body.results.forEach(function(value,index){
														     									if(value.error == 'NotRegistered'){
														     										adminUser.merchantRegisterationIds.androidIds.splice(index, 1);
														     									}	
														     								});
														     								adminUser.save();	     								
														     							}
														     							// console.log("BODY:");
														     							// console.log(body);
														     							// console.log("ERROR:");
														     							// console.log(error);
																						// We pbbly have to redo TODO!
																					  }
																					});	  			    			
														  			    		}
													  			    			//ios devices
														  			    		if(adminUser.merchantRegisterationIds.iosIds && adminUser.merchantRegisterationIds.iosIds.length){
														  			    			var options = { 
														  			    				cert: 'merchantApnCert.pem',
														  			    				key: 'merchantApnKey.pem'
														  			    			};
																					var apnConnection = new apn.Connection(options);

																					adminUser.merchantRegisterationIds.iosIds.forEach(function(regId){
																						var myDevice = new apn.Device(regId);

																						var note = new apn.Notification();

																						note.expiry = Math.floor(Date.now() / 1000) + 60; // Expires 1 min from now.
																						note.badge = 1;
																						note.sound = "ping.aiff";
																						note.alert = user.username + " posted new insta! Match it up!";
																						note.payload = {'postId': toBeSavedMedia._id};

																						apnConnection.pushNotification(note, myDevice);									
																					});
																				}
											  			    				});
											  			    			}
											  			    		});
										  			    		}

									  			    		}
									  			    	}
													});
												});												
											}
										});
									}
								});
							}
						});

		});
	});
}, Config.get("GET_UNREGISTERED_MERCHANTS_POSTS_RUN_INTERVAL_SECONDS")*1000);
