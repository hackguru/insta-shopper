var express = require('express');
var router = express.Router();

router.get('/auth/:type/:device/:regId', function(req, res, next) {
	if(!req.params.type || !req.params.device || !req.params.regId){
		res.status(400).json({ error: 'wrong parameters supplied' });
		return;
	}
	var isBuyer = req.params.type != "merchant";
	req.instagram.use({
	  client_id: isBuyer ? Config.get("SHOPPER_INSTA_CLIENT_ID") : Config.get("MERCHANT_INSTA_CLIENT_ID"),
	  client_secret: isBuyer ? Config.get("SHOPPER_INSTA_CLIENT_SECRET") : Config.get("MERCHANT_INSTA_CLIENT_SECRET")
	});
	var redirectUrl = isBuyer ? Config.get("SHOPPER_INST_CALLBACK_URL") : Config.get("MERCHANT_INST_CALLBACK_URL");
	var state = req.params.device+":"+req.params.regId;
	res.redirect(req.instagram.get_authorization_url(redirectUrl, { state: state }));
});

router.get('/insta-merchant-cb', function(req, res, next) {
	authenticateUsers(req,res,next,false);
});


router.get('/insta-buyer-cb', function(req, res, next) {
	authenticateUsers(req,res,next,true);
});

function authenticateUsers(req, res, next, isBuyer){
	req.instagram.use({
	  client_id: isBuyer ? Config.get("SHOPPER_INSTA_CLIENT_ID") : Config.get("MERCHANT_INSTA_CLIENT_ID"),
	  client_secret: isBuyer ? Config.get("SHOPPER_INSTA_CLIENT_SECRET") : Config.get("MERCHANT_INSTA_CLIENT_SECRET")
	});
	var redirectUrl = isBuyer ? Config.get("SHOPPER_INST_CALLBACK_URL") : Config.get("MERCHANT_INST_CALLBACK_URL");
	req.instagram.authorize_user(req.query.code, redirectUrl, function(err, result) {
		if (err) {
		  console.log(err.body);
		  res.send("Didn't work");
		} else {
		  console.log('Yay! Access token is ' + result.access_token);
		  res.send('You made it!!');
		  var user = {
		  	bio: result.user.bio,
			fullName: result.user.full_name,
			profilePicture: result.user.profile_picture,
			username: result.user.username,
			website: result.user.website,
			type: isBuyer ? "buyer" : "merchant"
		  }
		  req.db.User.findOrCreate({instaId: result.user.id}, user, function(err, newUser) {
		    console.log(newUser);
		    newUser.token = result.access_token;
		    if(newUser.type != user.type){
		    	newUser.type = "both"
		    }
	    	var regKey = "merchantRegisterationIds";
	    	if(isBuyer) {
	    		regKey = "buyerRegisterationIds"
	    	}
		    var states = req.query.state.split(":");
		    var deviceKey = "iosIds";
		    if(states[0] === "android"){
		    	deviceKey = "androidIds";
		    }

		    //Removing regId from other users that have the same id
	    	var queryObject = {};
			queryObject[regKey+'.'+deviceKey] = states[1];
			req.db.User.find( queryObject,  function(err, usersWithCurrentRegId){
				if(!err && usersWithCurrentRegId){
					usersWithCurrentRegId.forEach(function(userWithCurrentRegId){
						if(userWithCurrentRegId._id.toString() != newUser._id.toString()){
							var index = userWithCurrentRegId[regKey][deviceKey].indexOf(states[1]);
							userWithCurrentRegId[regKey][deviceKey].splice(index, 1);
							userWithCurrentRegId.save();						
						}
					});
				} else {
					console.log(err);
				}
			});

	    	if(newUser[regKey]) {
	    		if(newUser[regKey][deviceKey]){
	    			if(newUser[regKey][deviceKey].indexOf(states[1])<0) {
	    				newUser[regKey][deviceKey].push(states[1]);
	    			}
	    		} else {
	    			newUser[regKey][deviceKey] = [states[1]]; 
	    		}
	    	} else {
		    	newUser[regKey] = {};
		    	newUser[regKey][deviceKey] = [states[1]]; 
	    	}
		    newUser.save();
		  });
		}
	});	
}

router.get('/userId', function(req, res, next) {
	if(!req.user){
		res.status(401).json({ error: 'unauthorized user' });
		return;
	}
	res.json({ userId: req.user._id});
});

router.get('/:userId/likedMedias', function(req, res, next) {
	if(!req.user || req.user._id != req.params.userId){
		res.status(401).json({ error: 'unauthorized user' });
		return;
	}
	var count = req.query.count || 30;
	var date = Date.parse(req.query.date) || Date.now();
	req.db.Like.find({likedBy : req.params.userId, likedDate: { $lt: date }})
				.sort({'likedDate': 'desc'})
				.limit(count)
				.populate({ path: 'media' })
				.exec(function(err, medias) {
					if(!err){
						res.json({
							results: medias
						});
					} else {
						res.status(404).json({ error: 'could not find any records' });
					}
				});
});

router.get('/:userId/newlyLikedMedias', function(req, res, next) {
	if(!req.user || req.user._id != req.params.userId){
		res.status(401).json({ error: 'unauthorized user' });
		return;
	}
	var date = Date.parse(req.query.date);
	if(!date){
		res.status(404).json({ error: 'no min date passed' });
	}
	req.db.Like.find({likedBy : req.params.userId, likedDate: { $gt: date }})
				.sort({'likedDate': 'desc'})
				.limit(count)
				.populate({ path: 'media' })
				.exec(function(err, medias) {
					if(!err){
						res.json({
							results: medias
						});
					} else {
						res.status(404).json({ error: 'could not find any records' });
					}
				});
});

router.get('/:userId/postedMedias', function(req, res, next) {
	if(!req.user || req.user._id != req.params.userId){
		res.status(401).json({ error: 'unauthorized user' });
		return;
	}
	var count = req.query.count || 30;
	var date = Date.parse(req.query.date) || Date.now();
	req.db.Media.find({owner : req.params.userId, created: { $lt: date }})
				.sort({'created': 'desc'})
				.limit(count)
				.exec(function(err, medias) {
					if(!err){
						res.json({
							results: medias
						});
					} else {
						res.status(404).json({ error: 'could not find any records' });
					}
				});
});

router.get('/:userId/newlyPostedMedias', function(req, res, next) {
	if(!req.user || req.user._id != req.params.userId){
		res.status(401).json({ error: 'unauthorized user' });
		return;
	}
	var date = Date.parse(req.query.date);
	if(!date){
		res.status(404).json({ error: 'no min date passed' });
	}
	req.db.Media.find({owner : req.params.userId, created: { $gt: date }})
				.sort({'created': 'desc'})
				.exec(function(err, medias) {
					if(!err){
						res.json({
							results: medias
						});
					} else {
						res.status(404).json({ error: 'could not find any records' });
					}
				});
});


router.get('/merchant/:userId', function(req, res, next) {
	req.db.User.findOne({_id : req.params.userId, $or: [ { type: "merchant" }, { type: "both" } ] }, function(err, user) {
		if(!err){
			// For security reasons
			delete user.buyerRegisterationIds;
			delete user.merchantRegisterationIds;
			res.json(user);
		} else {
			res.status(404).json({ error: 'could not find any records' });
		}
	});
})

router.post('/updateRegId', function(req, res, next) {
	var newRegId = req.body.newRegId;
	if(!req.user){
		res.status(401).json({ error: 'unauthorized user' });
		return;
	}
    var deviceKey = "iosIds";
    if(req.device === "android"){
      deviceKey = "androidIds";
    }
    var typeKey = "merchantRegisterationIds";
    if(req.userType === "buyer") {
      typeKey = "buyerRegisterationIds"
    }    
	var index = user[typeKey][deviceKey].indexOf(oldRegId);
	user[typeKey][deviceKey].splice(index, 1);
	if(req.params.newRegId) {
		user[typeKey][deviceKey].push(req.params.newRegId);
	}
	user.save();					
	res.json({ status : 200 });
});

router.get('/:userId/logout', function(req, res, next) {
	if(!req.user){
		res.status(401).json({ error: 'unauthorized user' });
		return;
	}
    var deviceKey = "iosIds";
    if(req.params.device === "android"){
    	deviceKey = "androidIds";
    }
	var typeKey = "merchantRegisterationIds";
	if(req.params.type === "buyer") {
		typeKey = "buyerRegisterationIds"
	}
	var index = user[typeKey][deviceKey].indexOf(regId);
	user[typeKey][deviceKey].splice(index, 1);
	user.save();					
	res.json({ status : 200 });
});


module.exports = router;
