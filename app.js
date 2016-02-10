//Module Dependencies
var express = require("express");
app = express();
var bodyparser = require("body-parser");
var http = require('http').Server(app);
io = require('socket.io')(http);
var path = require('path');
//Bluemix Mobile Cloud dependencies
var ibmbluemix = require('ibmbluemix');
//Web App Dependencies
var cookieParser = require('cookie-parser');
var routes = require('./routes/index');
var users = require('./routes/users');
var admin = require('./routes/admin');
var forms = require('./routes/forms');
var upload = require('./routes/upload');
//Google Login Dependencies
passport = require('passport');
 session = require('express-session');

/**
 *  view engine setup
 *
 */
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

/**
 * Configuring app
 *
 */
app.use(bodyparser.json())
app.use(bodyparser.urlencoded({
    extended: false
}))
app.use(cookieParser());

//Setting up passport authentication
app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: 'utcisasecret'
}));


app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});

/**
 * Adding Routes to defined file directories
 */
app.use('/', routes);
app.use('/users', users);
app.use('/admin', admin);
app.use('/forms', forms);
app.use('/upload', upload);
app.use(express.static(path.join(__dirname, 'public')));


/**
 * Bluemix Configuration Setup
 *
 * @type {{applicationRoute: string, applicationId: string}}
 */
var config = {
    // change to real application route assigned for your application        
    applicationRoute: "http://utc-vat.mybluemix.net",
    // change to real application key generated by Bluemix for your application        
    applicationId: "0a27a50e-8c7f-487d-9135-5b360732abbf"
};

// init core sdk
ibmbluemix.initialize(config);
var logger = ibmbluemix.getLogger();
var ibmconfig = ibmbluemix.getConfig(); //Getting context for app


// init service sdks
app.use(function (req, res, next) {
    //    req.ibmpush = ibmpush.initializeService(req);
    req.logger = logger;
    next();
});

// init basics for an express app
app.use(require('./lib/setup'));

//uncomment below code to protect endpoints created afterwards by MAS
//var mas = require('ibmsecurity')();
//app.use(mas);


logger.info('mbaas context root: ' + ibmconfig.getContextRoot());
// "Require" modules and files containing endpoints and apply the routes to our application
app.use(ibmconfig.getContextRoot(), require('./lib/accounts'));
app.use(ibmconfig.getContextRoot(), require('./lib/staticfile'));


http.listen(ibmconfig.getPort(), function () {
    console.log('Express server listening on port ' + ibmconfig.getPort());
});

//TODO: Deprecated?
//Test of URI using app context
app.get(ibmconfig.getContextRoot() + '/test', function (req, res) {
    res.status(200).send("Test Complete"); //Removing status code affects the android app's response.
});

//BlueList Auth Sample Push notification code

/*

 //get context root to deploy your application
 //the context root is '${appHostName}/v1/apps/${applicationId}'
 var contextRoot = ibmconfig.getContextRoot();
 appContext=express.Router();
 app.use(contextRoot, appContext);

 console.log("contextRoot: " + contextRoot);

 // log all requests
 app.all('*', function(req, res, next) {
 console.log("Received request to " + req.url);
 next();
 });

 // create resource URIs
 // endpoint: https://mobile.ng.bluemix.net/${appHostName}/v1/apps/${applicationId}/notifyOtherDevices/
 appContext.post('/notifyOtherDevices', function(req,res) {
 var results = 'Sent notification to all registered devices successfully.';

 console.log("Trying to send push notification via JavaScript Push SDK");
 var message = { "alert" : "The data has been updated.",
 "url": "http://www.google.com"
 };

 req.ibmpush.sendBroadcastNotification(message,null).then(function (response) {
 console.log("Notification sent successfully to all devices.", response);
 res.send("Sent notification to all registered devices.");
 }, function(err) {
 console.log("Failed to send notification to all devices.");
 console.log(err);
 res.send(400, {reason: "An error occurred while sending the Push notification.", error: err});
 });
 });

 // host static files in public folder
 // endpoint:  https://mobile.ng.bluemix.net/${appHostName}/v1/apps/${applicationId}/static/
 appContext.use('/static', express.static('public'));

 //redirect to cloudcode doc page when accessing the root context
 app.get('/', function(req, res){
 res.sendfile('public/index.html');
 });



 */