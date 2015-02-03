var Config = require('nconf');
Config = require('nconf');
Config.argv()
     .env()
     .file({ file: 'config.json' });
var CronJob = require('cron').CronJob;
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

new CronJob('*/'+Config.get("WORKER_RUN_INTERVAL_SECONDS")+' * * * * *', function(){
    console.log('starting new run of task');
    db.User
    	.find({ $or: [ { type: "buyer" }, { type: "both" } ] })
		.sort({'lastQueried': 'asc'})
		.limit(Config.get("USERS_PER_WORKER_RUN"))
		.exec(function(err, users) {
     		users.forEach(function(user){
     			instagram.use({ access_token: user.token });
     			instagram.user_self_liked(
     				{ count:Config.get("WORKER_RUN_INTERVAL_SECONDS")/*assume users do one like persecond*/, min_id:user.lastLikedInstaId },
     			 	function(err, medias, pagination, remaining, limit) {
     			 		if(!err){
	     					if(medias.length){
	     						//saving last id that was querried
	     						medias.forEach(function(media, index){
	     							if(media.id == user.lastLikedInstaId){
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
						     						db.Like.findOrCreate({likedBy: user, media: mediaFromDB}, {likedDate: Date.now()}, function(err, toBeSavedLike) {
									  			    	if(!err){
									  			    		toBeSavedLike.save();
									  			    		if(index == medias.length - 1){
									     						user.lastLikedInstaId = medias[0].id;
									     						user.save();									  			    			
									  			    		}
									  			    	} else {
									  			    		console.log(err);
									  			    		return;
									  			    	}
									  			    });

												  } else {
													console.log("BODY:\n" + body);
													console.log("ERROR:\n" + error);
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
}, null, true, "America/Los_Angeles");

