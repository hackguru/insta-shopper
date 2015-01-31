var express = require('express');
var router = express.Router();
var redirectUrl = Config.get("INST_CALLBACK_URL");

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get('/auth/:type', function(req, res, next) {
	res.redirect(req.instagram.get_authorization_url(redirectUrl, { state: req.params.type }));
});

router.get('/insta-cb', function(req, res, next) {
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
			type: req.query.state  	
		  }
		  req.db.User.findOrCreate({instaId: result.user.id}, user, function(err, newUser) {
		    console.log(newUser);
		    newUser.token = result.access_token;
		    if(newUser.type != req.query.state){
		    	newUser.type = "both"
		    }
		    newUser.save();
		  });
		}
	});
});

module.exports = router;
