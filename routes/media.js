var express = require('express');
var router = express.Router();
var url = require('url');

router.post('/matchScreenShot/:mediaId', function(req, res, next) {
	req.db.Media.findOne({ _id: req.params.mediaId }, function (err, media) {
	  if (err){
		req.uploader(req, res, function(err, s3Response){
			if(!err){
			  	console.log(err);
			  	//TODO
				res.end(JSON.stringify({ statusCode: 500 }));
			  } else {
			  	var previousUrl = media.productLinkScreenshot;
			  	media.productLinkScreenshot = s3Response.req.url;
			  	media.save();
				res.end(JSON.stringify({ statusCode: 200 }));

				//Deleting old image
				var uri = url.parse(previousUrl);

				var params = {
				  Bucket: uri.hostname.split(".")[0],
				  Delete: {
				    Objects: [
				      {
				        Key: uri.path.substr(1)
				      }
				    ]
				  }
				};

				req.s3.deleteObjects(params, function(err, data) {
				  if (err) console.log(err, err.stack); // an error occurred
				});

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
	var updateObj = {};
	if (req.body.productUrl) {
		updateObj["linkToProduct"] = req.body.productUrl;
		updateObj["isMatchedWithProduct"] = req.body.true;		
	}
	if (req.body.productDescription) {
		updateObj["productDescription"] = req.body.productUrl;
	}
	req.db.Media.update({ _id: req.params.mediaId }, { isMatchedWithProduct: true, linkToProduct: req.body.productUrl, productDescription: req.body.productDescription }, function (err) {
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
