var express = require('express');
var router = express.Router();

router.post('/matchScreenShot/:mediaId', function(req, res, next) {
	req.uploader(req, res, function(err, s3Response){
		if(!err){
			req.db.Media.update({ _id: req.params.mediaId }, { productLinkScreenshot: s3Response.req.url }, function (err) {
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
			res.status(400).json({ error: 'could not complete operation' });
			//TODO
		}		
	});
});

router.post('/match/:mediaId', function(req, res, next) {
	req.db.Media.update({ instaId: req.params.mediaId }, { isMatchedWithProduct: true, linkToProduct: req.body.productUrl, productDescription: req.body.productDescription }, function (err) {
	  if (err){
	  	console.log(err);
	  	//TODO
		res.end(JSON.stringify({ statusCode: 500 }));
	  } else {
		res.end(JSON.stringify({ statusCode: 200 }));
	  }
	});			
});

router.get('/:mediaId', function(req, res, next) {
	req.db.Media.findOne({_id : req.params.mediaId}, function(err, media) {
		if(!err && media){
			res.json(media);
		} else {
			res.status(404).json({ error: 'could not find any records' });
		}
	});
});

module.exports = router;
