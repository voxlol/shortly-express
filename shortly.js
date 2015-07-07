var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var expressSession = require('express-session');
var cookieParser = require('cookie-parser');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(cookieParser());
app.use(expressSession({secret:'wombat'}));

app.get('/', function(req, res) {
  if(!req.session.username){
    res.redirect('/login');
  }
  else
    res.render('index');
});

app.get('/create', function(req, res) {
  if(!req.session.username) {
    res.redirect('/login');
  } else {
    res.render('index');
  }
});

app.get('/links', function(req, res) {
  if(!req.session.username) {
    res.redirect('/login');
  } else {
    Links.reset().fetch().then(function(links) {
      res.send(200, links.models);
    });
  }
});

app.post('/links',
function(req, res) {
  var uri = req.body.url;
  if(!req.session.username) {
    res.redirect('/login');
  }
  else if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.get('/login', function (req, res) {
  res.render('login');
});

app.post('/login', function (req, res) {
  var userName = req.body.username;
  var passWord = req.body.password;

  var currentUserModel = Users.where({username: userName}) || undefined;
  // find the hash from the database table, compare it to the session variable
  // on successful login, set the req.session.token to be stored
  var dbUser = knex('users').where({
    username : currentUserModel.get('username'),
    password : currentUserModel.get('password')
  });

  if(dbUser){
    // login here. Store a variable with a session
    req.session.token = currentUserModel.get('password');
    res.redirect('/');
  }else{
    // not a user
    res.redirect('login')
  }

});

app.get('/signup', function (req, res){
  res.render('signup');
});

app.post('/signup', function (req, res){
  var userName = req.body.username;
  var passWord = req.body.password;
  var newUser = new User({'username':userName, 'password':passWord});
  newUser.save().then(function(newUser){
    Users.add(newUser);
    res.redirect('/');
  })
});


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
