/* Dotenv is a zero-dependency module that loads environment variables from a .env file into process.env. 
Storing configuration in the environment separate from code */
require('dotenv').config();

const express       = require("express");
const app           = express();
const bodyParser    = require("body-parser"); //make available form data in req.body
const mongoose      = require("mongoose");
const passport      = require("passport");
const localStrategy = require("passport-local");
const methodOverride = require("method-override");
const flash         = require("connect-flash");
const expressSanitizer = require("express-sanitizer");
const path = require('path');

// var Campground      = require("./models/campground");
// var Comment         = require("./models/comment");
var User            = require("./models/user");
var seedDB          = require("./seeds");

var commentRoutes       = require("./routes/comments");
var campgroundRoutes    = require("./routes/campgrounds");
var indexRoutes         = require("./routes/index");

const fileName      = "app.js";

 /* USE DEPRECATED FUNCTIONS */
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

mongoose.connect(process.env.DATABASEURL, {useNewUrlParser: true, useUnifiedTopology: true}); 

/* body-parser extract the entire body portion of an incoming request stream and exposes it on req. body */
app.use(bodyParser.urlencoded({extended: true})); 
app.set("view engine", "ejs"); /* TO DEFAULT VIEW FILES TO .ejs EXTENSION */
app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/scripts"));
// app.use(express.static(path.join(__dirname, './public')));
// app.use(express.static(path.join(__dirname, './scripts')));
app.use(methodOverride("_method")); /* SEND _method FROM VIEWS TO USE PUT AND DELETE ROUTES */
app.use(flash()); /* FOR FLASH MESSAGES ON WEBPAGE */
app.use(expressSanitizer());
// seedDB(); // ENABLE TO RESET DB DATA AND ADD BASIC SEED DATA

/* 
https://martinfowler.com/articles/session-secret.html

We need to generate the key using a Cryptographically Secure Pseudo Random Number Generator, or CSPRNG. We can do this on unix systems by reading data from /dev/urandom and encoding with base64 so that we end up with printable ASCII characters:

$ head -c20 /dev/urandom | base64
Xe005osOAE8ZRMDReizQJjlLrrs=
Here we are generating a 20 byte, or 160 bit key. What key size you should be using is a great question for your security specialist. I’m choosing 20 bytes because that is how long SHA-1 is, and having a longer secret isn’t going to help us. If we thought that 160 bits was not secure enough, we would need to replace SHA-1 as well as increasing the length of the session secret.

Next, instead of adding this secret to the source code, we’ll reference it dynamically through an environment variable.

set :session_secret, ENV.fetch('SESSION_SECRET') { SecureRandom.hex(20) } 
This will try to pull the session secret in from an environment variable, and just in case we forget to specify one, will generate it dynamically when the environment variable is missing.

Finally, we must specify this environment variable when the application starts up:

SESSION_SECRET=’Xe005osOAE8ZRMDReizQJjlLrrs=’ ruby sinatra-app.rb -p 8080 

 */ 

// PASSPORT CONFIGURATION - START
app.use(require("express-session")({
    secret: "KfCTA8vDlpXzKtDBFGpj/hVWdsU=",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
// PASSPORT CONFIGURATION - END

/*  Make user login details available on each page by
    setting it in response.locals instead of passing it as an argument in
    each res.render function. for example - 
    res.render("campgrounds/index", {
                campgrounds: allCampgrounds, 
                currentUser: req.user
            });
*/ 
app.locals.moment = require('moment');

app.use(async function(req, res, next){
    res.locals.currentUser = req.user;

    if(req.user) {
        /* PERFORMANCE CHECK - Performance issue if user have thousands of notifications. Run as a separate process then or load first 5 and have a 'show more' button to load more notifications. */
        try {
            let user = await User.findById(req.user._id).populate('notifications', null, { isRead: false }).exec();
            //store the notifications array in a local variable
            res.locals.notifications = user.notifications.reverse();
        } catch (error) {
            console.log(error.message);
        }
    }

    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    app.locals.debugMode = true; // SET TO TRUE OR FALSE
    res.locals.isFollowing = false;
    next();
});

// Requiring routes
/* Campground routes are prefixed with the first argument text as passed in 
   the app.use function below */
app.use("/", indexRoutes);   
app.use("/campgrounds", campgroundRoutes); 
app.use("/campgrounds/:id/comments", commentRoutes);

// BEFORE END OF FILE SCRIPTS

app.get("*", (req, res) => {
    // res.render("pagenotfound");
    res.render("pagenotfound");
});

app.listen(process.env.PORT, process.env.IP, () => { console.log(fileName + ": The YelpCamp Server Has Started!"); });


// app.listen(process.env.port, process.env.IP, function(){
//     // code here
// });