var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
	res.redirect("http://www.linkmy.photos/");
  // res.render('index', { title: 'Express' });
});

module.exports = router;
