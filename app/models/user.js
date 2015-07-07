var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  initialize: function(){
    this.on('creating', function(model, attrs, options) {
      return bcrypt.hash(model.get('password'), null, null, function(err, hash){
        if(err) console.log(err);
        model.set('password', hash);
      });
    })
  }
});

module.exports = User;
