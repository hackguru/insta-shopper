var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var types = 'buyer merchant both'.split(' ');
var findOrCreate = require('mongoose-findorcreate');

var Media = new Schema ({
  title: {
    required: true,
    type: String,
    trim: true,
    // match: /^([[:alpha:][:space:][:punct:]]{1,100})$/
    match: /^([\w ,.!?]{1,100})$/
  },
  url: {
    type: String,
    trim: true,
    max: 1000
  },
  text: {
    type: String,
    trim: true,
    max: 2000
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  owner: {
    id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    }
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
  }
});

Media.pre('save', function (next) {
  if (!this.isModified('updated')) this.updated = new Date;
  next();
})

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
    type: Number,
    required: true,
    trim: true
  },
  type: {
    type:String,
    enum: types,
    required: true,
    default: types[0]
  },
  created: {
    type: Date,
    default: Date.now
  },
  updated:  {
    type: Date,
    default: Date.now
  },
  posts: {
    own: [Schema.Types.Mixed],
    likes: [Schema.Types.Mixed]
  },
  stripeToken: Schema.Types.Mixed
});

User.plugin(findOrCreate);

User.statics.findProfileById = function(id, fields, callback) {
  var User = this;
  var Media = User.model('Media');

  return User.findById(id, fields, function(err, obj) {
    if (err) return callback(err);
    if (!obj) return callback(new Error('User is not found'));

    Media.find({
      owner: {
        id: obj._id,
        name: obj.displayName
      }
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