var express = require('express');
var router = express.Router();
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var model_users = require('../models/users');
var model_data = require('../models/data');
userjson = null;


/* GET home page. */
router.get('/', function (req, res, next) {
    // console.log("USER_2: " + JSON.stringify(req.user, null, 2));

    if (req.isAuthenticated()) {
        // logged in
        res.render('index', {
            title: 'SIPS',
            name: req.user.name.givenName + " " + req.user.name.familyName,
            isAdmin: req.user.isAdmin
        });
    } else {
        passport.use(new GoogleStrategy({
                clientID: '185585020623-o8hdaup59vfnlt18hpbss7utdsjng85j.apps.googleusercontent.com',
                clientSecret: 'vFXPWHiA18ssRJ606AAOERHY',
                callbackURL: req.protocol + '://' + req.get('host') + '/users/auth/google/callback'
            },
            function (token, refreshToken, profile, done) {
                //check if user is in database
                model_users.UserCheck(profile);
                userjson = profile;

                //call done() when complete...
                done(null, profile);
            }
        ));
        res.render('users/login');
    }
});

router.get('/logout', function (req, res, next) {
    req.logout();
    res.redirect('/');
});

router.get('/results', ensureAuthenticated, function (req, res, next) {

    var results = model_data.getUserTaskList(req);
    // console.log("CHECK USER:: " + req.user);
    res.render('results', {
        title: 'Results',
        name: req.user.name.givenName + " " + req.user.name.familyName,
        id: req.user.id,
        isAdmin: req.user.isAdmin,
        taskList: results
    })
});

router.post('/results/data', ensureAuthenticated, function (req, res, next) {

    var data = model_data.getUserTaskData(req);

    console.log("RESULTS_AJAX: " + JSON.stringify(data, null, 2));
    res.send({
        data: data
    })
});


//route functions
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated())
        return next();
    else
        res.redirect('/');
}

module.exports = router;
