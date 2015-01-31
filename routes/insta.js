var express = require('express');
var router = express.Router();


router.get('/post', function(req, res, next) {
	console.log(req);
	res.send(req.query['hub.challenge']);
});

router.post('/post', function(req, res, next) {
	console.log(req);
	res.send('respond with a resource');
});

module.exports = router;
