var express = require('express');
var router = express.Router();

router.get('/auth/:type/:device/:regId', function(req, res, next) {
	if(!req.params.type || !req.params.device || !req.params.regId){
		res.send("no good");
		//TODO: right error code!
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

module.exports = router;
