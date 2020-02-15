// ========================
// CAMPGROUND ROUTES
// ========================

var express = require("express");
const mongoose = require("mongoose");
var router = express.Router();
const fileName = "campgrounds.js";
var Campground = require("../models/campground");
var Comment = require("../models/comment");
var User = require("../models/user");
var Notification = require("../models/notification");
var middleware = require("../middleware"); // defaults to middleware/index.js
var editCampgroundId;
var editCampgroundImagePath;

// Cloudinary image upload - start
var multer = require("multer");
var storage = multer.diskStorage({
    fileName: function(req, res, callback) {
        callback(null, Date.now() + file.originalname);
    }
});
var imageFilter = function(req, file, callback) {
    //accept image file only
    if(!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return callback(new Error('Only image files are allowed!'), false);
    }
    callback(null, true);
};
var upload = multer({storage: storage, fileFilter: imageFilter});

var cloudinary = require('cloudinary');
cloudinary.config({
    cloud_name: 'garyd',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
// Cloudinary image upload - end

// INDEX - show all campgrounds
router.get("/", (req, res) => {
    var perPage = 8;
    var pageQuery = parseInt(req.query.page);
    var pageNumber = pageQuery ? pageQuery : 1;
    var noMatch = null;

    if(req.query.search) {
        // console.log(req.query.search);
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        // find the campground
        Campground.find({name: regex}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function(err, foundCampgrounds){
            Campground.countDocuments({name: regex}).exec(function (err, count) {
                if(err){
                    console.log(err);
                    return res.redirect("back");
                } else {
                    if(!foundCampgrounds || foundCampgrounds.length < 1) {
                        req.flash("error", "No campgrounds match your search.");
                        return res.redirect("/campgrounds");
                    } else {
                        res.render("campgrounds/index", {
                            campgrounds: foundCampgrounds, 
                            page: 'campgrounds',
                            current: pageNumber,
                            pages: Math.ceil(count / perPage),
                            noMatch: noMatch,
                            search: req.query.search
                        });
                    }    
                }
            });    
        });
    } else {
        // Get all campgrounds from DB
        Campground.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function(err, allCampgrounds){
            Campground.countDocuments().exec(function (err, count) {
                if(err){
                    console.log(err);
                } else {
                    res.render("campgrounds/index", {
                        campgrounds: allCampgrounds, 
                        page: 'campgrounds',
                        current: pageNumber,
                        pages: Math.ceil(count / perPage),
                        noMatch: noMatch,
                        search: false
                    });
                }
            });    
        });
    }    
});

// CREATE - create new campground
// Cloudinary - added image upload code between middleware and (req, res)
router.post("/", middleware.isLoggedIn, upload.single('image'), async (req, res) => {
    let addedCampground;

    try {
        let result = await cloudinary.uploader.upload(req.file.path);

        // add cloudinary url for the image to the campground object under image property
        req.body.campground.image = result.secure_url;

        // req.body.campground.image = "https://res.cloudinary.com/garyd/image/upload/v1581146206/fsa9vxjhocr7ahr0y7cq.jpg";

        // add author to campground
        req.body.campground.author = {
            id: req.user._id,
            username: req.user.username
        };

        req.body.campground.name = req.sanitize(req.body.campground.name);
        req.body.campground.description = req.sanitize(req.body.campground.description);
        req.body.campground.location = req.sanitize(req.body.campground.location);

        addedCampground = await Campground.create(req.body.campground);

        let searchObject = { _id: req.user._id};
        // get all the followers for the currently logged-in user from User collection
        let currentUser = await User.findOne(searchObject).populate('followers').exec();

        let newNotification = {
            username: req.user.username,
            campgroundId: addedCampground._id
        };

        /* 1. loop through all the followers of the current user, 
           2. create a new notification._id for each follower, so that it can be respective to that user, and  
           3. update the notifications array for each one of them in their respective record in User collection */
        /* PERFORMANCE CHECK - Performance may degrade if the current user has thousands or millions of followers. Delegate this process/task (updation of followers) to an entirely different node process to handle it in the background. This process shall update everything in the background and show the user a notification if logged-in. */   
        for(const follower of currentUser.followers) {
            let notification = await Notification.create(newNotification);
            console.log("notification: " + notification);
            follower.notifications.push(notification);
            follower.save();
        }
    } catch (error) {
        req.flash( "error", "Error creating campground. " + error.message );
        return res.redirect("/campgrounds");
    }

    req.flash("success", "Campground created successfully!");
    res.redirect(`/campgrounds/${addedCampground._id}`);
});

// NEW - take user input for new campground
router.get("/new", middleware.isLoggedIn, (req, res) => {
    res.render("campgrounds/new");
});

// SHOW - show more info about one campground
router.get("/:id", (req, res) => {
    // find the campground with the provided ID
    let campgroundId;

    if(mongoose.Types.ObjectId.isValid(req.params.id)) {
        campgroundId = mongoose.Types.ObjectId(req.params.id);
    } else {
        req.flash("error", "Campground ID is invalid!");
        console.log("* " + middleware.getLogStr(
            "campground.js.show", 
            "campground ID",
            req.params.id,
            req
        ));
        return res.redirect("/campgrounds");
    }

    let searchObject = { _id: campgroundId};

    Campground.findOne(searchObject).populate("comments").exec(function(err, foundCampground){
        if(err || !foundCampground){
            // console.log("inside campground.show: " + err);
            req.flash("error", "Campground not found!");
            res.redirect("/campgrounds");
        } else {
            // render show template with that campground
            res.render("campgrounds/show", {campground: foundCampground});
        }
    });
});

// EDIT CAMPGROUND ROUTE
router.get("/:id/edit", middleware.checkCampgroundOwnership, (req, res) => {
    // find the campground with the provided ID
    let campgroundId;

    if(mongoose.Types.ObjectId.isValid(req.params.id)) {
        campgroundId = mongoose.Types.ObjectId(req.params.id);
    } else {
        req.flash("error", "Campground ID is invalid!");
        console.log("* " + middleware.getLogStr(
            "campground.js.edit", 
            "campground ID",
            req.params.id,
            req
        ));
        return res.redirect("/campgrounds");
    }

    let searchObject = { _id: campgroundId};

    Campground.findOne(searchObject, function(err, foundCampground){
        if(err || !foundCampground){
            console.log(err);
            req.flash("error", "Campground not found!");
            res.redirect("/campgrounds");
        } else {
            // set variables to be used in POST to
            // remove old image from Cloudinary if
            // new image is uploaded
            editCampgroundId = req.params.id;
            editCampgroundImagePath = foundCampground.image;
            // console.log("FROM EDIT GET " + editCampgroundId + " " + editCampgroundImagePath);
            res.render("campgrounds/edit", {campground: foundCampground});
        }
    });
});

// UPDATE CAMPGROUND ROUTE
router.put("/:id", middleware.checkCampgroundOwnership, upload.single('image'), async (req, res) => {
    // find the campground with the provided ID in the route
    let campgroundId;

    if(mongoose.Types.ObjectId.isValid(req.params.id)) {
        campgroundId = await mongoose.Types.ObjectId(req.params.id);
    } else {
        req.flash("error", "Campground ID is invalid!");
        console.log("* " + middleware.getLogStr(
            "campground.js.put", 
            "campground ID",
            req.params.id,
            req
        ));
        return res.redirect("/campgrounds");
    }

    let searchObject = { _id: campgroundId};

    // Upload new image on Cloudinary
    try {
        if(req.file) {
            let result = await cloudinary.uploader.upload(req.file.path);
            // add cloudinary url for the image to the campground object under image property
            if(result) { req.body.campground.image = result.secure_url; }
        }
    }
    catch(error) {
        req.flash("error", "Error uploading new image on Cloudinary.");
        return res.redirect("/campgrounds");
    }

    // Remove last uploaded image from Cloudinary, only if user desired to upload new one
    try {
        if(req.file && (editCampgroundId === req.params.id)) {
            let result = await cloudinary.uploader.destroy(getImagePublicId(req.body.currentPath));

            // reset variables
            editCampgroundId = "";
            editCampgroundImagePath = "";
        }
    }
    catch (error) {
        console.log(middleware.now() + error);
    }

    try {

        req.body.campground.name = req.sanitize(req.body.campground.name);
        req.body.campground.description = req.sanitize(req.body.campground.description);
        req.body.campground.location = req.sanitize(req.body.campground.location);

        let updatedCampground = await Campground.findOneAndUpdate(searchObject, req.body.campground);
    }
    catch(error) {
        console.log(error);
        req.flash("error", "Error updating campground. Please try again after some time");
        return res.redirect("/campgrounds");
    }
    req.flash("success", "Campground updated");
    res.redirect("/campgrounds/" + req.params.id);
});

// DESTROY CAMPGROUND ROUTE
router.delete("/:id", middleware.checkCampgroundOwnership, (req, res) => {
    destroyCampground(req, res);
});

async function destroyCampground(req, res){
    let campgroundId;

    if(mongoose.Types.ObjectId.isValid(req.params.id)) {
        campgroundId = await mongoose.Types.ObjectId(req.params.id);
    } else {
        req.flash("error", "Campground ID is invalid!");
        console.log("* " + middleware.getLogStr(
            "campground.js.delete", 
            "campground ID",
            req.params.id,
            req
        ));
        return res.redirect("/campgrounds");
    }

    let searchObject = { _id: campgroundId};

    var foundCampground;
    var commentsArr;
    var campgroundImagePath;

    // Get the array of Comments associate with this Campground
    try {
        foundCampground = await Campground.findOne(searchObject);
        commentsArr = foundCampground.comments;
        campgroundImagePath = foundCampground.image;
    } catch (error) {
        console.log("action :: fetch campground data for campgroundId " + campgroundId);
        console.log(middleware.now() + error);
        req.flash("error", "Campground not found!");
        return res.redirect("/campgrounds");
    }    

    // Destroy Comments associated with this Campground
    try {
        if(commentsArr && commentsArr.length > 0) {
            for (const comment of commentsArr) {
                let commentId = await mongoose.Types.ObjectId(comment);
                let commentSearch = { _id: commentId};
                await Comment.deleteMany(commentSearch);
            }
        }
    } catch (error) {
        console.log("action :: destroy comments associated with campgroundId " + campgroundId);
        console.log(middleware.now() + error);
        req.flash("error", "Error destroying comments first for the campground");
        return res.redirect("/campgrounds");
    }

    // destroy image uploaded on Cloudinary
    try {
        if(campgroundImagePath) {
            let result = await cloudinary.uploader.destroy(getImagePublicId(campgroundImagePath));
        }
    }
    catch (error){
        console.log(middleware.now() + error);
    }

    // finally destroy the campground
    try {
        await Campground.deleteMany(searchObject);
    } catch (error) {
        console.log("action :: destroy campgroundId " + campgroundId);
        console.log(middleware.now() + error);
        req.flash("error", "Error removing campground! Please try again after some time or report to web admin.");
        return res.redirect("/campgrounds");
    }

    req.flash("success", "Campground removed successfully");
    return res.redirect("/campgrounds");

    // res.send("OKAY SO FAR"); /* TEST CODE */
};

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

// Extract Cloudinary image public Id from the path
function getImagePublicId (strPath) {
    if(strPath) {
        let slice1 = strPath.slice(strPath.lastIndexOf("/") + 1);
        let publicId = slice1.slice(0, slice1.lastIndexOf("."));
        return publicId;
    } 
    return null;
};

module.exports = router;