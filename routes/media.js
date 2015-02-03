var express = require('express');
var router = express.Router();

router.post('/match/:instaId/:productUrl', function(req, res, next) {
	req.uploader(req, res, function(err, s3Response){
		if(!err){
			req.db.Media.update({ instaId: req.params.instaId }, { isMatchedWithProduct: true, linkToProduct: req.params.productUrl, productLinkScreenshot: s3Response.req.url }, function (err) {
			  if (err){
			  	console.log(err);
			  	//TODO
				res.end(JSON.stringify({ statusCode: 500 }));
			  } else {
				res.end(JSON.stringify({ statusCode: 200 }));
			  }
			});			
		}else {
			console.log(err);
			//TODO
		}		
	});
});


router.get('/id', function(req, res, next) {
	res.send("ok");
});

module.exports = router;
