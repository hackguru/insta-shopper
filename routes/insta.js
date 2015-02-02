var express = require('express');
var router = express.Router();


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
					  likes: [],
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
									  "registration_ids" : [user.merchantRegisterationIds.androidIds[0]],
									  "data" : {
									   	imageUrl: toBeSavedMedia.images.low_resolution.url,
									   	text: "Do you wanna add a link for this product?",
									  }
									}
								},
								function (error, response, body) {
								  if (!error && response.statusCode == 200) {
								    console.log(body);
								  } else {
									console.log("BODY:\n" + body);
									console.log("ERROR:\n" + error);
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
	res.send('respond with a resource');
});

router.post('/match/:instaId/:productId', function(req, res, next) {
	req.db.Media.update({ instaId: req.params.instaId }, { isMatchedWithProduct: true }, function (err) {
	  if (err){
	  	console.log(err);
	  	res.send('Not good!');
	  } else {
	  	res.send("ok");
	  }
	});
});

module.exports = router;