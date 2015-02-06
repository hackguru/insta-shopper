var express = require('express');
var router = express.Router();
var request = require('request');


router.get('/post', function(req, res, next) {
	console.log(req);
	res.send(req.query['hub.challenge']);
});

router.post('/post', function(req, res, next) {
   // [ { changed_aspect: 'media',
	  // object: 'user',
	  // object_id: '1686295026',
	  // time: 1422761294,
	  // subscription_id: 16642046,
	  // data: { media_id: '910510192435687045_1686295026' } }],
	req.body.forEach(function(currentValue){
		var userId = currentValue.object_id;
		var mediaId = currentValue.data.media_id;
		req.db.User.findOne({instaId: userId}, function (err, user) {
			if(!err){
				if(user.type === "buyer"){
					console.log("User is not merchant");
					return;
				}
				req.instagram.use({ access_token: user.token });
				req.instagram.media(mediaId, function(err, media, remaining, limit) {
					var newMedia = {
					  caption: media.caption ? media.caption.text : null,
					  instaId: media.id,
					  owner: user,
					  videos: media.videos ? media.videos : null,
					  images: media.images ? media.images : null,
					  link : media.link,
					  type: media.type
					};
	  			    req.db.Media.findOrCreate({instaId: media.id}, newMedia, function(err, toBeSavedMedia) {
	  			    	if(!err){
	  			    		toBeSavedMedia.save();
	  			    		// push notification to seller
	  			    		if(user.merchantRegisterationIds.androidIds && user.merchantRegisterationIds.androidIds.length){
								request(
								{
									uri: Config.get("GCM_SEND_URL"),
									method: "POST",
									headers: {Authorization:("key="+Config.get("GCM_API_KEY"))},
									json: {
									  "registration_ids" : user.merchantRegisterationIds.androidIds,
									  "data" : {
									   	imageUrl: toBeSavedMedia.images.low_resolution.url,
									   	text: "Do you wanna add a link for this product?",
									  }
									}
								},
								function (error, response, body) {
								  if (!error && response.statusCode == 200 && body.success > 0 /*at least one device got it*/) {
								    console.log(body);
								    //TODO: refactor this between two apis
	     							if(body.canonical_ids) {
	     								body.results.forEach(function(value,index){
	     									if(value.registration_id){
	     										user.merchantRegisterationIds.androidIds.splice(index, 1);
	     										user.merchantRegisterationIds.androidIds.push(value.registration_id);
	     									}	
	     								});
	     								user.save();
	     							}
								  } else {
	     							console.log("BODY:");
	     							console.log(body);
	     							console.log("ERROR:");
	     							console.log(error);
									// We pbbly have to redo TODO!
								  }
								});	  			    			
	  			    		}
	  			    	}else{
							console.log(err);
							//TODO : handle error
	  			    	}
					});
				});
			}else{
				console.log(err);
				//TODO : handle error
			}	
		});
	});
	res.send('ok');
});

module.exports = router;
