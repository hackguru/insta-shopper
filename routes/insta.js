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
		reg.db.User.findOne({ instaId: userId }, function (err, user) {
			if(!err){
				req.instagram.use({ access_token: user.token });
				req.instagram.media(mediaId, function(err, media, remaining, limit) {
					console.log(media);
				});
			}else{
				console.log(err);
				//TODO : handle error
			}	
		});
	});
	res.send('respond with a resource');
});

module.exports = router;
