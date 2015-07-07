var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  // hasTimestamps: true,

  initialize: function(){
    this.on('creating', this.hashPassword);
  },

  comparePassword: function(plainPass, cb){
    var that = this;
    bcrypt.compare(plainPass, this.get('password'), function(err, isMatch){
      console.log('b: ' + that.get('password'));
      console.log(plainPass);
      if(err) console.log(err);
      cb(isMatch);
    });
  },

  hashPassword: function(){
    var cipher = Promise.promisify(bcrypt.hash);
    return cipher(this.get('password'), null,null).bind(this)
      .then(function(hash){
        this.set('password', hash);
      })
  }
});

module.exports = User;
