var express = require('express');
var router = express.Router();
var url = require('url');

router.post('/matchScreenShot/:mediaId', function(req, res, next) {
	if(!req.user){
		res.status(401).json({ error: 'unauthorized access' });
		return;
	}
	var findQuery = { _id: req.params.mediaId };
	if(!req.user.isAdmin){
		findQuery.owner = req.user;
	}
	req.db.Media.findOne(findQuery, function (err, media) {
	  if (!err && media){
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
			res.status(401).json({ error: 'unauthorized user or no media' });
			//TODO
		}		
	});
});

router.post('/match/:mediaId', function(req, res, next) {
	if(!req.user){
		res.status(401).json({ error: 'unauthorized access' });
		return;
	}
	var updateObj = {};
	if (req.body.linkToProduct || req.body.linkToProduct==="") {
		updateObj["linkToProduct"] = req.body.linkToProduct;
		if(req.body.linkToProduct===""){
			updateObj["isMatchedWithProduct"] = false;
		} else {
			updateObj["isMatchedWithProduct"] = true;		
		}
	}
	if (req.body.productDescription || req.body.linkToProduct==="") {
		if(req.body.productDescription.length > 46){
			res.status(400).json({ error: "lengh of description cannot be more than 46 characters"});
			return;
		}
		updateObj["productDescription"] = req.body.productDescription;
	}

	var findQuery = { _id: req.params.mediaId };
	if(!req.user.isAdmin){
		findQuery.owner = req.user;
	}

	req.db.Media.update(findQuery, updateObj, function (err) {
	  if (err){
	  	console.log(err);
	  	//TODO
		res.end(JSON.stringify({ statusCode: 401 }));
	  } else {
		res.end(JSON.stringify({ statusCode: 200 }));
	  }
	});			
});

router.get('/:mediaId', function(req, res, next) {
	if(!req.user){
		res.status(401).json({ error: 'unauthorized access' });
		return;
	}
	var findQuery = { _id: req.params.mediaId };
	if(!req.user.isAdmin){
		findQuery.owner = req.user;
	}
	req.db.Media.findOne(findQuery, function(err, media) {
		if(!err && media){
			res.json(media);
		} else {
			res.status(401).json({ error: 'unauthorized user or could not find any records' });
		}
	});
});

module.exports = router;
