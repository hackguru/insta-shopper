var Config = require('nconf');
Config = require('nconf');
Config.argv()
     .env()
     .file({ file: 'config.json' });
var instagram = require('instagram-node').instagram();
var mongoose = require('mongoose');
var request = require('request');
var models = require('../models');
var connection = mongoose.createConnection(Config.get("Db_CONNECTION_STRING"));
connection.on('error', console.error.bind(console,
  'connection error:'));
connection.once('open', function () {
  console.info('connected to database')
});
var db = {
    User: connection.model('User', models.User, 'users'),
    Media: connection.model('Media', models.Media, 'medias'),
    Like: connection.model('Like', models.Like, 'likes')
}

setInterval(function(){
    console.log('starting new run of task');
    db.User
    	.find({ $or: [ { type: "buyer" }, { type: "both" } ] })
		.sort({'lastQueried': 'asc'})
		.limit(Config.get("USERS_PER_WORKER_RUN"))
		.exec(function(err, users) {
     		users.forEach(function(user){
     			instagram.use({ access_token: user.token });
     			instagram.user_self_liked(
     				{ count:Config.get("WORKER_RUN_INTERVAL_SECONDS")/*assume users do one like persecond*/ },
     			 	function(err, medias, pagination, remaining, limit) {
     			 		if(!err){
	     					if(medias.length){
	     						//saving last id that was querried
	     						var currentLastTimestamp = user.lastLikedTimestamp; 
	     						user.lastLikedTimestamp = medias[0].created_time;
	     						user.lastQueried = Date.now();
	     						user.save();									  			    			
	     						medias.forEach(function(media){
	     							if(media.created_time <= currentLastTimestamp){
	     								return;
	     							}
		     						db.Media.findOne({instaId: media.id, isMatchedWithProduct : true } , function (err, mediaFromDB) {
		     							if (mediaFromDB){
			     							// push notification to buyer;
			     							if(user.buyerRegisterationIds.androidIds && user.buyerRegisterationIds.androidIds.length){
												request(
												{
													uri: Config.get("GCM_SEND_URL"),
													method: "POST",
													headers: {Authorization:("key="+Config.get("GCM_API_KEY"))},
													json: {
													  "registration_ids" : user.buyerRegisterationIds.androidIds,
													  "data" : {
													   	imageUrl: mediaFromDB.images.low_resolution.url,
													   	text: mediaFromDB.productDescription,
													   	productLink: mediaFromDB.linkToProduct,
													   	linkSrceenShot: mediaFromDB.productLinkScreenshot
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
						     						db.Like.findOrCreate({likedBy: user, media: mediaFromDB}, {likedDate: Date.now()}, function(err, toBeSavedLike) {
									  			    	if(!err){
									  			    		toBeSavedLike.save();
									  			    	} else {
									  			    		console.log(err);
									  			    		return;
									  			    	}
									  			    });

												  } else {
													console.log("BODY:\n");
 													console.log(body);
													console.log("ERROR:\n");
													console.log(error);
												  }
												});			     								
			     							}
		     							}
		     						});
	     						});
	     					}
     			 		} else{
     			 			console.log(err);
     			 			//TODO
     			 		}
     				}
     			);
     		});
		});
}, Config.get("WORKER_RUN_INTERVAL_SECONDS")*1000);

