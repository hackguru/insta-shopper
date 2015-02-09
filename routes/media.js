var express = require('express');
var router = express.Router();
var url = require('url');

router.post('/matchScreenShot/:mediaId', function(req, res, next) {
	req.db.Media.findOne({ _id: req.params.mediaId }, function (err, media) {
	  if (!err){
		req.uploader(req, res, function(err, s3Response){
			if(err){
			  	console.log(err);
			  	//TODO
				res.end(JSON.stringify({ statusCode: 400 }));
			  } else {
			  	var previousUrl = media.productLinkScreenshot;
			  	media.productLinkScreenshot = s3Response.req.url;
			  	media.save();
				res.end(JSON.stringify({ statusCode: 200 }));

				if(previousUrl)	{
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
	req.db.Media.findOne({ _id: req.params.mediaId }, function (err, media) {
	  if (err){
	  	console.log(err);
	  	//TODO
		res.end(JSON.stringify({ statusCode: 500 }));
	  } else {
	  	console.log(req.body);
		if (req.body.linkToProduct) {
			media["linkToProduct"] = req.body.linkToProduct;
			media["isMatchedWithProduct"] = (req.body.linkToProduct === "") ? false : true;
		}
		if (req.body.productDescription) {
			media["productDescription"] = req.body.productDescription;
		}
		media.save();
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
