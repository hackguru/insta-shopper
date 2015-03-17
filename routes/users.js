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
		  res.render('fail');
		} else {
		  console.log('Yay! Access token is ' + result.access_token);
		  res.render('success');
		  var user = {
			username: result.user.username,
			type: isBuyer ? "buyer" : "merchant"
		  }
		  req.db.User.findOrCreate({instaId: result.user.id}, user, function(err, newUser) {
		  	newUser.bio = result.user.bio;
			newUser.fullName = result.user.full_name;
			newUser.profilePicture = result.user.profile_picture;
			newUser.website = result.user.website;
		    if(isBuyer){
			    newUser.buyerToken = result.access_token;
		    	console.log("It's a buyer with token: " + newUser.buyerToken);			    
		    }else{
			    newUser.merchantToken = result.access_token;
		    	console.log("It's a merchant with token: " + newUser.merchantToken);			    
		    }
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
		    console.log(newUser);
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
	var count = req.query.count || 0;
	var startDate = (req.query.startDate) ? Date.parse(req.query.startDate) : undefined;
	var endDate = (req.query.endDate) ? Date.parse(req.query.endDate) : undefined;
	var createdDateQuery = {};
	if(startDate && endDate){
		createdDateQuery['$lte'] = endDate;
		createdDateQuery['$gte'] = startDate;
	} else  if (startDate && !endDate){
		createdDateQuery['$gt'] = startDate;
	} else if (!startDate && endDate){
		createdDateQuery['$lt'] = endDate;
		count = count || 30;
	} else {
		count = count || 30;
		createdDateQuery['$lte'] = Date.now();
	}
	req.db.Like.find({likedBy : req.params.userId, likedDate: createdDateQuery})
				.sort({'likedDate': 'desc'})
				.limit(count)
				.deepPopulate('media.owner')
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
	var count = req.query.count || 0;
	var startDate = (req.query.startDate) ? Date.parse(req.query.startDate) : undefined;
	var endDate = (req.query.endDate) ? Date.parse(req.query.endDate) : undefined;
	var createdDateQuery = {};
	if(startDate && endDate){
		createdDateQuery['$lte'] = endDate;
		createdDateQuery['$gte'] = startDate;
	} else  if (startDate && !endDate){
		createdDateQuery['$gt'] = startDate;
	} else if (!startDate && endDate){
		createdDateQuery['$lt'] = endDate;
		count = count || 30;
	} else {
		count = count || 30;
		createdDateQuery['$lte'] = Date.now();
	}

	var findQuery = {};
	findQuery.created = createdDateQuery;
	if (req.user.isAdmin) {
		req.db.User.find({ isAdminManaged: true }, function(err, users) {
			if(!err && users){
				users.push(req.user);
				findQuery.owner = { $in: users };
				req.db.Media.find(findQuery)
							.sort({'created': 'desc'})
							.limit(count)
							.populate({ path: 'owner', select: '-followsInstaIds -r -buyerRegisterationIds -merchantRegisterationIds -token -buyerToken -merchantToken -isAdmin' })
							.exec(function(err, medias) {
								if(!err){
									res.json({
										results: medias
									});
								} else {
									res.status(404).json({ error: 'could not find any records' });
								}
							});
			} else {
				res.status(404).json({ error: 'could not find any records' });				
			}
		});
	} else {
		findQuery.owner = req.params.userId;
		req.db.Media.find(findQuery)
					.sort({'created': 'desc'})
					.limit(count)
					.populate({ path: 'owner', select: '-followsInstaIds -r -buyerRegisterationIds -merchantRegisterationIds -token -buyerToken -merchantToken -isAdmin' })
					.exec(function(err, medias) {
						if(!err){
							res.json({
								results: medias
							});
						} else {
							res.status(404).json({ error: 'could not find any records' });
						}
					});
	}
});

router.get('/:userId/matchedMedia', function(req, res, next) {
	var count = req.query.count || 0;
	var startDate = (req.query.startDate) ? Date.parse(req.query.startDate) : undefined;
	var endDate = (req.query.endDate) ? Date.parse(req.query.endDate) : undefined;
	var createdDateQuery = {};
	if(startDate && endDate){
		createdDateQuery['$lte'] = endDate;
		createdDateQuery['$gte'] = startDate;
	} else  if (startDate && !endDate){
		createdDateQuery['$gt'] = startDate;
	} else if (!startDate && endDate){
		createdDateQuery['$lt'] = endDate;
		count = count || 30;
	} else {
		count = count || 30;
		createdDateQuery['$lte'] = Date.now();
	}

	var findQuery = {};
	findQuery.created = createdDateQuery;
	findQuery.owner = req.params.userId;
	findQuery.isMatchedWithProduct = true;
	req.db.Media.find(findQuery)
				.sort({'created': 'desc'})
				.limit(count)
				.populate({ path: 'owner', select: '-followsInstaIds -r -buyerRegisterationIds -merchantRegisterationIds -token -buyerToken -merchantToken -isAdmin'})
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

router.get('/:userId/followsMedia', function(req, res, next) {
	if(!req.user || req.user._id != req.params.userId){
		res.status(401).json({ error: 'unauthorized user' });
		return;
	}
	var count = req.query.count || 0;
	var startDate = (req.query.startDate) ? Date.parse(req.query.startDate) : undefined;
	var endDate = (req.query.endDate) ? Date.parse(req.query.endDate) : undefined;
	var createdDateQuery = {};
	if(startDate && endDate){
		createdDateQuery['$lte'] = endDate;
		createdDateQuery['$gte'] = startDate;
	} else  if (startDate && !endDate){
		createdDateQuery['$gt'] = startDate;
	} else if (!startDate && endDate){
		createdDateQuery['$lt'] = endDate;
		count = count || 30;
	} else {
		count = count || 30;
		createdDateQuery['$lte'] = Date.now();
	}

	req.db.User.findOne({_id:req.params.userId},function(err, user){
		if(!err && user){
			req.db.User.find( { instaId: { $in: user.followsInstaIds } , $or: [ { type: "merchant" }, { type: "both" } ] },function(err, follows){
				if(!err && follows){
					var findQuery = {};
					findQuery.created = createdDateQuery;
					findQuery.isMatchedWithProduct = true;
					findQuery.owner = { $in: follows };
					req.db.Media.find(findQuery)
								.sort({'created': 'desc'})
								.limit(count)
								.populate({ path: 'owner', select: '-followsInstaIds -r -buyerRegisterationIds -merchantRegisterationIds -token -buyerToken -merchantToken -isAdmin' })
								.exec(function(err, medias) {
									if(!err){
										res.json({
											results: medias
										});
									} else {
										res.status(404).json({ error: 'could not find any records' });
									}
								});			

				} else {
					res.status(404).json({ error: 'could not find any records' });
				}
			});
		} else  {
			res.status(404).json({ error: 'could not find any records' });
		}
	});
});


router.get('/:userId/recommendedMerchants', function(req, res, next) {
	if(!req.user || req.user._id != req.params.userId){
		res.status(401).json({ error: 'unauthorized user' });
		return;
	}
	req.db.User.find({ $or: [ { type: "merchant" }, { type: "both" } ], canBeFeatured: true })
			   .select('-followsInstaIds -r -buyerRegisterationIds -merchantRegisterationIds -token -buyerToken -merchantToken -isAdmin')
			   .exec(function(err, merchants) {
		if(!err){
			res.json({
				results: merchants
			});
		} else {
			res.status(404).json({ error: 'could not find any records' });
		}
	});
});

router.post('/:userId/opened/:mediaId', function(req, res, next) {
	if(!req.user || req.user._id != req.params.userId){
		res.status(401).json({ error: 'unauthorized user' });
		return;
	}
	req.db.Open.create({ openedBy: req.user, openedDate: Date.now(), media: req.params.mediaId }, function(err) {
		if(!err){
			res.json({
				status: "ok"
			});
		} else {
			res.status(500).json({ error: 'could not insert the like record' });
			console.log(err);
		}
	});
});

router.get('/merchant/:userId', function(req, res, next) {
	req.db.User.findOne({_id : req.params.userId, $or: [ { type: "merchant" }, { type: "both" } ] }, function(err, user) {
		if(!err){
			// For security reasons
			// TODO
			delete user.buyerRegisterationIds;
			delete user.merchantRegisterationIds;
			res.json(user);
		} else {
			res.status(404).json({ error: 'could not find any records' });
		}
	});
});

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
	var index = req.user[typeKey][deviceKey].indexOf(req.reqId);
	req.user[typeKey][deviceKey].splice(index, 1);
	if(newRegId) {
		req.user[typeKey][deviceKey].push(newRegId);
	}
	req.user.save();					
	res.json({ status : 200 });
});

router.post('/newUnregisteredMerchant/:username', function(req, res, next) {
	//TODO: seccure this call
	//Gettingn a random access token
	var filter = {
		$or:[
			{ $and:[{merchantToken: {$exists:true}}, {merchantToken: {$ne:null}}, {merchantToken: {$ne:""}}] },
			{ $and:[{buyerToken: {$exists:true}}, {buyerToken: {$ne:null}}, {buyerToken: {$ne:""}}] }
		]
	}
	var fields = {merchantToken:1, buyerToken:1};
	var options = { limit: 1 }
	req.db.User.findRandom(filter, fields, options, function (err, userWithToken) {
		userWithToken = userWithToken[0];
		if(!err && userWithToken){
			var token;
			if(userWithToken.buyerToken){
				token = userWithToken.buyerToken;
			} else {
				token = userWithToken.merchantToken;
			}
			req.instagram.use({ access_token: token });
			req.instagram.user_search(req.params.username, { count: 1 }, function(err, userFromInsta, pagination, remaining, limit) {
				userFromInsta = userFromInsta[0];
				if(!err && userFromInsta){
					console.log(userFromInsta);
					var newUser = {
						username: userFromInsta.username,
						type: "merchant"
					};
					req.db.User.findOrCreate({instaId: userFromInsta.id}, newUser, function(err, newUserAfterCreate) {
						newUserAfterCreate.bio = userFromInsta.bio;
						newUserAfterCreate.fullName = userFromInsta.full_name;
						newUserAfterCreate.profilePicture = userFromInsta.profile_picture;
						newUserAfterCreate.website = userFromInsta.website;
						newUserAfterCreate.type = newUserAfterCreate.type === "merchant" ? "merchant" : "both";
						newUserAfterCreate.isAdminManaged = true;
						newUserAfterCreate.save();
						res.json(newUserAfterCreate);
					});
 			 	} else {
					console.log(err);
					res.status(400).json({error:"couldn't connect to instagram"});
 			 	}
		 	});
		} else {
			console.log(err);
			res.status(400).json({error:"could find token to run insta call"});
		}
	});
});


module.exports = router;
