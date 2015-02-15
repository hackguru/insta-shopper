var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var instagram = require('instagram-node').instagram();
var Framer = require('framer');
var AWS = require('aws-sdk');
var AWS_KEY = process.env.AWS_KEY || Config.get("AWS_KEY")
  , AWS_SECRET = process.env.AWS_SECRET || Config.get("AWS_SECRET")
  , AWS_S3BUCKET = process.env.AWS_S3BUCKET || Config.get("AWS_S3BUCKET");
process.env.AWS_ACCESS_KEY_ID = AWS_KEY;
process.env.AWS_SECRET_ACCESS_KEY = AWS_SECRET;

var framer = new Framer({
  s3: {
    secure: false,
    key: AWS_KEY,
    secret: AWS_SECRET,
    bucket: AWS_S3BUCKET
  }
});

var serveImage = framer.serveImage({ prefix: '/img', cacheMaxAge: 3600 });
var handleUpload = framer.handleUpload({
  // authHandler: function (value, cb) {
  //   //TODO
  //   cb(null, value);
  // },
  prefix: '/img'
});

function framerSetup(req, res, next){
    req.uploader = handleUpload;
    req.imageServer = serveImage;
    return next();
}

//aws Setup
AWS.config.region = 'us-west-2';

var s3 = new AWS.S3();

function setupS3(req, res, next){
    req.s3 = s3;
    return next();
}

var routes = require('./routes/index');
var users = require('./routes/users');
var insta = require('./routes/insta');
var media = require('./routes/media')

var models = require('./models');

// Database
var connection = mongoose.createConnection(Config.get("Db_CONNECTION_STRING"));
connection.on('error', console.error.bind(console,
  'connection error:'));
connection.once('open', function () {
  console.info('connected to database')
});

function db(req, res, next) {
    req.db = {
        User: connection.model('User', models.User, 'users'),
        Media: connection.model('Media', models.Media, 'medias'),
        Like: connection.model('Like', models.Like, 'likes')
    };
    return next();
};

// instagaram
function instaSetup(req, res, next){
    req.instagram = instagram;
    return next();
}

function getApiRequestUser(req, res, next){
  var req.reqId = req.get('token');
  var req.device =  req.get('device');
  var req.userType = req.get('userType');
  if(req.reqId && req.device && req.userType){
    var deviceKey = "iosIds";
    if(req.device === "android"){
      deviceKey = "androidIds";
    }
    var typeKey = "merchantRegisterationIds";
    if(req.userType === "buyer") {
      typeKey = "buyerRegisterationIds"
    }    
    var queryObject = {};
    queryObject[typeKey+'.'+deviceKey] = req.reqId;
    queryObject['$or'] = [ { type: req.userType }, { type: "both" } ] 
    req.db.User.findOne( queryObject,  function(err, user){
      if(!err && user){
        req.user = user; 
        return next();
      } else {
        // TODO - log this
        return next();
      }
    });
  } else {
    return next();
  }
}

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', instaSetup, db, getApiRequestUser, users);
app.use('/insta', instaSetup, db, insta);
app.use('/media', db, framerSetup, setupS3, getApiRequestUser, media);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
