var express = require('express');
var router = express.Router();


router.get('/post', function(req, res, next) {
	console.log(req);
	res.send(req.query['hub.challenge']);
});

router.post('/post', function(req, res, next) {
   // [ { changed_aspect: 'media',
   //     object: 'user',
   //     object_id: '1686295026',
   //     time: 1422755996,
   //     subscription_id: 16642046,
   //     data: [Object] } ],
	req.body.forEach(function(currentValue){
		console.log(currentValue);
	});
	res.send('respond with a resource');
});

module.exports = router;
