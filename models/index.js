var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var userTypes = 'buyer merchant both'.split(' ');
var mediaTypes =  'image video'.split(' ' );
var findOrCreate = require('mongoose-findorcreate');

var autoUpdateTimeStamp = function (next) {
  now = new Date();
  this.updated_at = now;
  if ( !this.created_at ) {
    this.created_at = now;
  }
  next();
};

var Media = new Schema ({
  caption: {
    required: false,
    type: String,
    trim: true
  },
  instaId: {
    type: String,
    required: true,
    trim: true
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
  },
  created: {
    type: Date,
    default: Date.now,
    required: true
  },
  updated:  {
    type: Date,
    default: Date.now,
    required: true
  },
  videos: {
    low_bandwidth: {
      url: String,
      width: Number,
      height: Number
    },
    standard_resolution: {
      url: String,
      width: Number,
      height: Number
    },
    low_resolution: {
      url: String,
      width: Number,
      height: Number
    }
  },
  images: {
    low_resolution: {
      url: String,
      width: Number,
      height: Number
    },
    thumbnail: {
      url: String,
      width: Number,
      height: Number
    },
    standard_resolution: {
      url: String,
      width: Number,
      height: Number
    }
  },
  link : String,
  type: {
    type:String,
    enum: mediaTypes,
    required: true,
    default: mediaTypes[0]
  },
  isMatchedWithProduct : Boolean,
  linkToProduct: String
});

Media.pre('save', autoUpdateTimeStamp);
Media.plugin(findOrCreate);

var User = new Schema({
  token: String,
  username: {
    type: String,
    required: true,
    trim: true
  },
  fullName: {
    type: String,
    required: false,
    trim: true
  },
  bio: {
    type: String,
    required: false,
    trim: true
  },
  website: {
    type: String,
    required: false,
    trim: true
  },
  profilePicture: {
    type: String,
    required: false,
    trim: true
  },
  instaId: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type:String,
    enum: userTypes,
    required: true,
    default: userTypes[0]
  },
  created: {
    type: Date,
    default: Date.now
  },
  updated:  {
    type: Date,
    default: Date.now
  },
  lastQueried : {
    type: Date,
    default: null    
  },
  lastLikedInstaId: String,
  merchantRegisterationIds:{
    androidIds : [String]
  },
  buyerRegisterationIds:{
    androidIds : [String]
  },
  posts: {
    own: [Schema.Types.Mixed],
    likes: [Schema.Types.Mixed]
  }
});

User.pre('save', autoUpdateTimeStamp);

User.plugin(findOrCreate);

User.statics.findProfileById = function(id, fields, callback) {
  var User = this;
  var Media = User.model('Media');

  return User.findById(id, fields, function(err, obj) {
    if (err) return callback(err);
    if (!obj) return callback(new Error('User is not found'));

    Media.find({
      owner: obj._id
    }, null, {
      sort: {
        'created': -1
      }
    }, function(err, list) {
      if (err) return callback(err);
      obj.posts.own = list || [];
      Media.find({
        likes: obj._id
      }, null, {
        sort: {
          'created': -1
        }
      }, function(err, list) {
        if (err) return callback(err);
        obj.posts.likes = list || [];
      });
    });
  });
}

exports.Media = Media;
exports.User = User;