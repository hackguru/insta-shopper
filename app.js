var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var instagram = require('instagram-node').instagram();

var routes = require('./routes/index');
var users = require('./routes/users');
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
        Media: connection.model('Media', models.Media, 'medias')
    };
    return next();
};

// instagaram
instagram.use({
  client_id: Config.get("INSTA_CLIENT_ID"),
  client_secret: Config.get("INSTA_CLIENT_SECRET")
});

function instaSetup(req, res, next){
    req.instagram = instagram;
    return next();
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
app.use('/users', instaSetup, db, users);

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
