var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var userTypes = 'buyer merchant both'.split(' ');
var mediaTypes =  'image video'.split(' ' );
var findOrCreate = require('mongoose-findorcreate');
var deepPopulate = require('mongoose-deep-populate');
var random = require('mongoose-random');

var autoUpdateTimeStamp = function (next) {
  now = new Date();
  this.updated_at = now;
  if ( !this.created_at ) {
    this.created_at = now;
  }
  next();
};

var Open = new Schema ({
    openedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required : true,
    },
    openedDate: {
      type: Date,
      default: Date.now,
      required: true,     
    },
    media: {
      type: Schema.Types.ObjectId,
      ref: 'Media',      
      required : true,
    }
});

var Like = new Schema ({
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required : true,
    },
    likedDate: {
      type: Date,
      default: Date.now,
      required: true,     
    },
    media: {
      type: Schema.Types.ObjectId,
      ref: 'Media',      
      required : true,
    }
});

Like.plugin(findOrCreate);
Like.plugin(deepPopulate);

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
  linkToProduct: String,
  productLinkScreenshot: String,
  productDescription: String
});

Media.pre('save', autoUpdateTimeStamp);
Media.plugin(findOrCreate);

var User = new Schema({
  merchantToken: {
    type: String,
    required: false
  },
  buyerToken:{
    type: String,
    required: false
  },
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
  canBeFeatured : {
    type: Boolean,
    default: false
  },
  isAdmin : {
    type: Boolean,
    default: false
  },
  merchantRegisterationIds:{
    androidIds : [String],
    iosIds: [String]
  },
  buyerRegisterationIds:{
    androidIds : [String],
    iosIds: [String]
  }
});

User.pre('save', autoUpdateTimeStamp);

User.plugin(findOrCreate);
User.plugin(random, { path: 'r' });

exports.Media = Media;
exports.User = User;
exports.Like = Like;
exports.Open = Open;