var express = require("express");
var router = express.Router();
var passport = require("passport");
var middleware = require("../middleware"); // defaults to middleware/index.js
const mongoose      = require("mongoose");
var async = require("async");
var nodemailer = require("nodemailer");
var crypto = require("crypto");

var User = require("../models/user");
var Campground = require("../models/campground");
var Notification = require("../models/notification");
const fileName = "index.js";


// Root route - HOME page
router.get("/", (req, res) => {
    delete req.session.redirectTo; //delete redirect to last page
    res.render("landing");
});

// ========================
// AUTH ROUTES
// ========================

// show register form
router.get("/register", function(req, res){
    delete req.session.redirectTo; //delete redirect to last page
    res.render("register", {page: 'register'});
});

// handle sign up logic
router.post("/register", (req, res) => {
    // registerUser(req, res);
    var registerUser = {
        username: req.sanitize(req.body.username),
        firstName: req.sanitize(req.body.firstName),
        lastName: req.sanitize(req.body.lastName),
        email: req.sanitize(req.body.email)
    };

    if(req.body.avatar){
        let avatar = req.body.avatar.trim();
        if(avatar !== ""){
            registerUser.avatar = avatar;
        }    
    }

    var newUser = new User(registerUser);

    User.register(newUser, req.body.password, function(err, user){
        if(err || !user){
            console.log(err);
            req.flash("error", err.message);
            return res.redirect("/register");
        }
        passport.authenticate("local")(req, res, function(){
            req.flash("success", "Welcome to YelpCamp, " + user.username + "!");
            res.redirect("/campgrounds");
        });
    }); 
});

// show login form
router.get("/login", (req, res) => {
    // set the return path for campground show page if user came
    // after click on login (on campground page) to add comments
    if(req.query) { 
        redirectPath = req.query.r;
        if (redirectPath && redirectPath.length > 0) {
            let delPos = redirectPath.lastIndexOf("/");
            if (delPos > 0) {
                let featureName = redirectPath.substr(0, delPos);
                if (featureName === "/campgrounds") {
                    let campgroundId = redirectPath.slice(delPos + 1);
                    if(mongoose.Types.ObjectId.isValid(campgroundId)) {
                        req.session.redirectTo = redirectPath;
                    }
                }    
            }    
        }     
    }    

    res.render("login", {page: 'login'});
});

// handle sign-in / login logic - Colt way
// router.post("/login", passport.authenticate("local", 
//     {
//         successRedirect: "/campgrounds",
//         failureRedirect: "/login",
//         failureFlash: true,
//         successFlash: 'Welcome to YelpCamp!'
//     }), function(req, res){

// });

router.post('/login', (req, res, next) => {
    passport.authenticate('local', function (err, user, info) {
        if(err) { return next(err); }
        if(!user) { return res.redirect('/login'); }
        req.logIn(user, function(err){
            if(err) { return next(err); }
            var redirectTo = req.session.redirectTo ? req.session.redirectTo : '/campgrounds';
            delete req.session.redirectTo;
            req.flash("success", "Welcome to YelpCamp, " + user.username);
            res.redirect(redirectTo);
        });
    })(req, res, next);
});

// logout route
router.get("/logout", (req, res) => {
    req.logOut();
    req.flash("success", "Logged you out!");
    res.redirect("/campgrounds");
});

// forgot password
router.get("/forgot", (req, res) => {
    delete req.session.redirectTo; //delete redirect to last page
    res.render("users/forgot");
});

router.post("/forgot", (req, res, next) => {
    async.waterfall([
        function(done){
            crypto.randomBytes(20, function(err, buf){
                // create a token that shall be sent to the user
                var token = buf.toString('hex');
                done(err, token);
            });
        },
        function(token, done){
            User.findOne({ email: req.body.email }, function(err, user){
                if(!user) {
                    req.flash('error', 'No account with that email address exists.');
                    return res.redirect('/forgot');
                }

                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

                user.save(function(err){
                    done(err, token, user);
                });
            });
        },
        function(token, user, done){
            var smtpTransport = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: 'gaurav.mendse@gmail.com',
                    pass: process.env.GMAILPW
                }
            });
            var mailOptions = {
                to: user.email,
                from: 'gaurav.mendse@gmail.com',
                subject: 'Node.js Password Reset',
                text: 'You are receiving this because you (or someone else) have requested the reset of the password.' + '\n\n' +
                'Please click on the following link, or paste this into your browser to complete the process - ' + '\n' + 
                'http://' + req.headers.host + '/reset/' + token + '\n\n' +
                'If you did not request this, please ignore this email and your password will remain unchanged.'
            };
            smtpTransport.sendMail(mailOptions, function(err){
                // console.log('mail sent');
                req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
                done(err, 'done');
            });
        }
    ], function(err) {
        if(err) return next(err);
        res.redirect('/forgot');
    });
});

// reset password
router.get("/reset/:token", (req, res) => {
    User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }   
        }, 
    function(err, user){
        if(!user){
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/forgot');
        }
        res.render("users/reset", {token: req.params.token});
    });
});

router.post('/reset/:token', (req, res) => {
    async.waterfall([
        function(done){
            User.findOne({
                resetPasswordToken: req.params.token,
                resetPasswordExpires: { $gt: Date.now() }
            },
            function(err, user){
                if(!user){
                    req.flash('error', 'Password reset token is invalid or has expired.');
                    return res.redirect('/');
                }
                if(req.body.password === req.body.confirm) {
                    user.setPassword(req.body.password, function(err){
                        user.resetPasswordToken = undefined;
                        user.resetPasswordExpires = undefined;

                        user.save(function(err){
                            req.logIn(user, function(err){
                                done(err, user);
                            });
                        });
                    });
                }
                // if both entered password doesn't match 
                else {
                    req.flash('error', 'Passwords do not match.');
                    return res.redirect('back');
                }
            });
        },
        function(user, done){
            var smtpTransport = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: 'gaurav.mendse@gmail.com',
                    pass: process.env.GMAILPW
                }
            });
            var mailOptions = {
                to: user.email,
                from: 'gaurav.mendse@gmail.com',
                subject: 'Your password has been changed',
                text: 'Hello,\n\n' +
                'This is a confirmation that the password for your account ' + user.email + ' has just changed.'
            };
            smtpTransport.sendMail(mailOptions, function(err){
                req.flash('success', 'Success! Your password has been changed.');
                done(err);
            });
        }
    ], function(err){
        res.redirect('/campgrounds');
    });
});

// USER PROFILE
router.get("/users/:id", middleware.isLoggedIn, async (req, res) => {
    let userId;
    let foundUser;
    let foundCampgrounds;

    if(mongoose.Types.ObjectId.isValid(req.params.id)) {
        userId = await mongoose.Types.ObjectId(req.params.id);
    } else {
        req.flash("error", "User ID is invalid!");
        console.log("* " + middleware.getLogStr(
            "index.js.get", 
            "user ID",
            req.params.id,
            req
        ));
        return res.redirect("/campgrounds");
    }    

    let userSearch = { _id: userId};

    // find user
    /* PERFORMANCE CHECK - Performance issue if user have thousands or millions of followers. Run as a separate process then. */
    try {
        foundUser = await User.findOne(userSearch).populate('followers').exec();
        if(!foundUser) {
            req.flash("error", "User not found!");
            return res.redirect("/campgrounds");
        }
    } catch (error) {
        req.flash("error", error.message);
        return res.redirect("/campgrounds");
    }

    // find campgrounds for that user
    try {
        foundCampgrounds = await Campground.find().where('author.id').equals(foundUser._id).exec();
    } catch (error) {
        req.flash("error", "Error fetching campgrounds for user profile. " + error.message);
        return res.redirect("/");
    }

    res.locals.isFollowing = false; // make sure to reset this ejs variable to false

    try {
        for(const follower of foundUser.followers) {
            if(req.user._id.equals(follower._id)) {
                res.locals.isFollowing = true;
                break;
            }
        }
    } catch (error) {
        req.flash("error", error.message);
    }

    res.render("users/show", { blogUser: foundUser, campgrounds: foundCampgrounds }); 
});

// update Admin options for user
router.put("/users/:id", middleware.isLoggedIn, async (req, res) => {
    let userId;
    let foundUser;

    if(!req.user.isAdmin) {
        req.flash("error", "You need to be an administrator to set these user options!");
        return res.redirect("back");
    }

    if(req.body) {
        if(mongoose.Types.ObjectId.isValid(req.params.id)) {
            userId = await mongoose.Types.ObjectId(req.params.id);
        } else {
            req.flash("error", "User ID is invalid!");
            console.log("* " + middleware.getLogStr(
                "index.js.put", 
                "user ID",
                req.params.id,
                req
            ));
            return res.redirect("/campgrounds");
        }

        let userSearch = { _id: userId};

        try {
            let updateFields = {};
            if(req.body.isAdmin) { 
                updateFields.isAdmin = true
            } else {
                updateFields.isAdmin = false
            }

            if(req.body.isPublisher) { 
                updateFields.isPublisher = true 
            } else {
                updateFields.isPublisher = false 
            }

            // console.log(updateFields);
            let updatedUser= await User.findOneAndUpdate(userSearch, updateFields);
        } catch (error) {
            req.flash("error", "Error updating Admin fields! " + error.message );
            return res.redirect("back");
        }

        req.flash("success", "Admin fields updated.");
    }    
    return res.redirect("/users/" + req.params.id);
});

// follow user
router.get('/follow/:id', middleware.isLoggedIn, async (req, res) => {
    let userId;
    let foundUser;

    if(mongoose.Types.ObjectId.isValid(req.params.id)) {
        userId = await mongoose.Types.ObjectId(req.params.id);
    } else {
        req.flash("error", "User ID is invalid!");
        console.log("* " + middleware.getLogStr(
            "index.js.get", 
            "user ID",
            req.params.id,
            req
        ));
        return res.redirect("/campgrounds");
    }

    let userSearch = { _id: userId};

    try {
        foundUser = await User.findOne(userSearch);
        if(!foundUser) {
            req.flash("error", "User not found!");
            return res.redirect("/campgrounds");
        }
        foundUser.followers.push(req.user._id); // push the user that's logged in
        foundUser.save();
        req.flash('success', 'Successfully followed ' + foundUser.username + '!');
    } catch (error) {
        req.flash('error', error.message);
    }
    res.redirect('/users/' + req.params.id);
});

// un-follow user
router.get('/unfollow/:id', middleware.isLoggedIn, async (req, res) => {
    let userId;
    let foundUser;

    if(mongoose.Types.ObjectId.isValid(req.params.id)) {
        userId = await mongoose.Types.ObjectId(req.params.id);
    } else {
        req.flash("error", "User ID is invalid!");
        console.log("* " + middleware.getLogStr(
            "index.js.get", 
            "user ID",
            req.params.id,
            req
        ));
        return res.redirect("/campgrounds");
    }

    let userSearch = { _id: userId};

    try {
        let foundUser = await User.findOneAndUpdate(
            userSearch,
            { $pull: { followers: req.user._id } } //pull out the user that's logged in
        );

        req.flash('success', 'You have un-followed ' + foundUser.username + '!');
    } catch (error) {
        console.log("action :: pull out un-follower and update UserId " + userId);
        console.log(middleware.now() + error.message);
        req.flash('error', error.message);
    }
    res.redirect('/users/' + req.params.id);
});

// view all notifications
router.get('/notifications', middleware.isLoggedIn, async (req, res) => {
    try {
        //populate notifications and sort them descending
        let foundUser = await User.findOne({ _id: req.user._id }).populate({
            path: 'notifications',
            options: {sort: { "_id": -1 } }
        }).exec();
        if(!foundUser) {
            req.flash("error", "User not found!");
            return res.redirect("/campgrounds");
        }

        let allNotifications = foundUser.notifications;
        res.render('notifications/show', { notifications: allNotifications })
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('back');
    }
});

// handle notification from menu
router.get('/notifications/:id', middleware.isLoggedIn, async (req, res) => {
    let notificationId;
    let foundNotification;

    if(mongoose.Types.ObjectId.isValid(req.params.id)) {
        notificationId = await mongoose.Types.ObjectId(req.params.id);
    } else {
        req.flash("error", "Notification ID is invalid!");
        console.log("* " + middleware.getLogStr(
            "index.js.get", 
            "notification ID",
            req.params.id,
            req
        ));
        return res.redirect("/back");
    }

    let searchObject = { _id: notificationId};

    try {
        foundNotification = await Notification.findOne(searchObject);
        if(!foundNotification) {
            req.flash("error", "Notification does not exist!")
            return res.redirect("back");
        }
        foundNotification.isRead = true;
        foundNotification.save();
        return res.redirect(`/campgrounds/${foundNotification.campgroundId}`);
    } catch (error) {
        req.flash("error", error.message);
        return res.redirect("back");
    }
});

router.delete("/notifications/:id", middleware.isLoggedIn, async (req, res) => {
    let notificationId;
    let foundNotification;

    if(mongoose.Types.ObjectId.isValid(req.params.id)) {
        notificationId = await mongoose.Types.ObjectId(req.params.id);
    } else {
        req.flash("error", "Notification ID is invalid!");
        console.log("* " + middleware.getLogStr(
            "index.js.delete", 
            "notification ID",
            req.params.id,
            req
        ));
        return res.redirect("/back");
    }

    let searchObject = { _id: notificationId};

    // remove notification from User collection
    try {
        let foundUser = await User.findOneAndUpdate(
            { _id: req.user._id },
            { $pull: { notifications: notificationId } }
        );
    } catch (error) {
        req.flash('error', error.message);
        return res.redirect('back');
    }

    // finally destroy notification from Notifications collection
    try {
        await Notification.deleteMany(searchObject);
    } catch (error) {
        req.flash('error', error.message);
        return res.redirect('back');
    }

    req.flash("success", "Notification removed.");
    res.redirect("/notifications");

});

// show login form
router.get("/about", (req, res) => {
    res.render("about", {page: 'about'});
});

module.exports = router;