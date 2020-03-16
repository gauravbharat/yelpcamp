"use strict";
const mongoose = require("mongoose");
let util = require("../general/util"); 
let Campground = util.utilDataModels.Campground;
let Comment = util.utilDataModels.Comment;
let User = util.utilDataModels.User;
let Notification = util.utilDataModels.Notification;

let cloudinary = require('cloudinary');
cloudinary.config({
  cloud_name: 'garyd',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

let sanitiseParms = util.sanitiseParms;
let editCampgroundId;
let editCampgroundImagePath;
let campgroundObj = {};

campgroundObj.showAllCampgrounds = async (req, res) => {
  let perPage = 8;
  let pageQuery = parseInt(req.query.page);
  let pageNumber = pageQuery ? pageQuery : 1;
  let noMatch = null;
  let totalUsers = 0; 
  let totalAdmins = 0;
  let totalContributors = 0;

  try {
    if(req.user && req.user.isAdmin) {
      totalUsers = await util.getUsersCount();
      totalAdmins = await util.getUsersCount({"isAdmin": true});
      let totalContributorsArr = await Campground.distinct('author.username');
      totalContributors = (totalContributorsArr) ? totalContributorsArr.length : 0;
    }  
  } catch (error) {
    console.log(util.getErrorStr(error));
  }

  // These variables would be passed to the index page but would be 
  // displayed only if the current user is an admin
  if(!totalUsers) { totalUsers = 0; }
  if(!totalAdmins) { totalAdmins = 0; }
  if(!totalContributors) { totalContributors = 0; }

  if(req.query.search) {
    // console.log(req.query.search);
    const regex = new RegExp(util.escapeRegex(req.query.search), 'gi');
    // find the campground
    try {
      let foundCampgrounds = await Campground.find({name: regex}).skip((perPage * pageNumber) - perPage).limit(perPage).exec();

      let count = await Campground.countDocuments({name: regex});
      let totalCount = await Campground.countDocuments({});

      if(!foundCampgrounds || foundCampgrounds.length < 1) {
        req.flash("error", "No campgrounds match your search.");
        return res.redirect("/campgrounds");
      } else {
        if(!count) { count = 0; }
        res.render("campgrounds/index", {
          campgrounds: foundCampgrounds, 
          page: 'campgrounds',
          current: pageNumber,
          pages: Math.ceil(count / perPage),
          noMatch: noMatch,
          search: req.query.search,
          totalCount: totalCount,
          totalUsers: totalUsers,
          totalAdmins: totalAdmins,
          totalContributors: totalContributors
        });
      }   
    } catch (error) {
      console.log(util.getErrorStr(error));
      return res.redirect("back");
    }
  } else {
    // Get all campgrounds from DB
    try {
      let allCampgrounds = await Campground.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).exec();
      
      let count = await Campground.countDocuments().exec();

      if(!count) { count = 0; }
      delete req.session.redirectTo; //delete redirect to last page

      res.render("campgrounds/index", {
        campgrounds: allCampgrounds, 
        page: 'campgrounds',
        current: pageNumber,
        pages: Math.ceil(count / perPage),
        noMatch: noMatch,
        search: false,
        totalCount: count,
        totalUsers: totalUsers,
        totalAdmins: totalAdmins,
        totalContributors: totalContributors
      });
    } catch(error) {
      console.log(util.getErrorStr(error));
      return res.redirect("back");
    }  
  }    
}

campgroundObj.createCampground = async (req, res) => {
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
      campgroundId: addedCampground._id,
      campgroundName: addedCampground.name,
      userId: req.user._id
    };

    /* 1. loop through all the followers of the current user, 
        2. create a new notification._id for each follower, so that it can be respective to that user, and  
        3. update the notifications array for each one of them in their respective record in User collection */
    /* PERFORMANCE CHECK - Performance may degrade if the current user has thousands or millions of followers. Delegate this process/task (updation of followers) to an entirely different node process to handle it in the background. This process shall update everything in the background and show the user a notification if logged-in. */   
    for(const follower of currentUser.followers) {
      let notification = await Notification.create(newNotification);
      // console.log("notification: " + notification);
      follower.notifications.push(notification);
      follower.save();
    }
  } catch (error) {
    req.flash( "error", "Error creating campground. " + error.message );
    return res.redirect("/campgrounds");
  }

  req.flash("success", "Campground created successfully!");
  res.redirect(`/campgrounds/${addedCampground._id}`);
}

campgroundObj.showCampground = (req, res) => {
  // find the campground with the provided ID
  let campgroundId;
  let commentId;

  if(req.params.comment_id) { commentId = req.params.comment_id; }

  sanitiseParms.inputId = req.params.id;
  sanitiseParms.location = 'campgroundObj.showCampground';
  sanitiseParms.option = util.utilConstants.CAMPGROUND_ID;
  
  let redirectPath = util.sanitiseIdentifier(req, res, sanitiseParms);
  if(redirectPath) { return res.redirect(redirectPath); }

  /* if redirectPath is returned undefined or null or blank, outputId is supposed to be returned as
  a valid ObjectId */
  campgroundId = sanitiseParms.outputId;  

  let searchObject = { _id: campgroundId};

  Campground.findOne(searchObject).populate("comments").exec(function(err, foundCampground){
    if(err || !foundCampground){
      // console.log("inside campground.show: " + err);
      req.flash("error", "Campground not found!");
      res.redirect("/campgrounds");
    } else {
      // render show template with that campground
      res.render("campgrounds/show", {
        campground: foundCampground
      , newUserCommentId: commentId
      });
    }
  });
}

campgroundObj.editCampground = (req, res) => {
  // find the campground with the provided ID
  let campgroundId;

  sanitiseParms.inputId = req.params.id;
  sanitiseParms.location = 'campgroundObj.editCampground';
  sanitiseParms.option = util.utilConstants.CAMPGROUND_ID;
  
  let redirectPath = util.sanitiseIdentifier(req, res, sanitiseParms);
  if(redirectPath) { return res.redirect(redirectPath); }

  /* if redirectPath is returned undefined or null or blank, outputId is supposed to be returned as
  a valid ObjectId */
  campgroundId = sanitiseParms.outputId;  

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
}

campgroundObj.updateCampground = async (req, res) => {
  // find the campground with the provided ID in the route
  let campgroundId;

  sanitiseParms.inputId = req.params.id;
  sanitiseParms.location = 'campgroundObj.updateCampground';
  sanitiseParms.option = util.utilConstants.CAMPGROUND_ID;
  
  let redirectPath = await util.sanitiseIdentifier(req, res, sanitiseParms);
  if(redirectPath) { return res.redirect(redirectPath); }

  /* if redirectPath is returned undefined or null or blank, outputId is supposed to be returned as
  a valid ObjectId */
  campgroundId = sanitiseParms.outputId;  

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
    console.log(util.getErrorStr(error));
    return res.redirect("/campgrounds");
  }

  // Remove last uploaded image from Cloudinary, only if user desired to upload new one
  try {
    if(req.file && (editCampgroundId === req.params.id)) {
      if(editCampgroundImagePath) {
        let result = await cloudinary.uploader.destroy(util.getCloudinaryImagePublicId(editCampgroundImagePath));
      }
      // reset variables
      editCampgroundId = "";
      editCampgroundImagePath = "";
    }
  }
  catch (error) {
    console.log(util.getErrorStr(error));
  }

  try {
    req.body.campground.name = req.sanitize(req.body.campground.name);
    req.body.campground.description = req.sanitize(req.body.campground.description);
    req.body.campground.location = req.sanitize(req.body.campground.location);

    let updatedCampground = await Campground.findOneAndUpdate(searchObject, req.body.campground);
  }
  catch(error) {
    console.log(util.getErrorStr(error));
    req.flash("error", "Error updating campground. Please try again after some time");
    return res.redirect("/campgrounds");
  }
  req.flash("success", "Campground updated");
  res.redirect("/campgrounds/" + req.params.id);
}

campgroundObj.deleteCampground = async (req, res) => {
  let campgroundId;

  sanitiseParms.inputId = req.params.id;
  sanitiseParms.location = 'campgroundObj.deleteCampground';
  sanitiseParms.option = util.utilConstants.CAMPGROUND_ID;
  
  let redirectPath = await util.sanitiseIdentifier(req, res, sanitiseParms);
  if(redirectPath) { return res.redirect(redirectPath); }

  /* if redirectPath is returned undefined or null or blank, outputId is supposed to be returned as
  a valid ObjectId */
  campgroundId = sanitiseParms.outputId;  
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
    console.log("action :: fetch campground data for campgroundId ", campgroundId);
    console.log(util.getErrorStr(error));
    req.flash("error", "Campground not found!");
    return res.redirect("/campgrounds");
  }    

  /* 09032020 - Gaurav - Remove notification traces when campground is deleted 
    1. get the followers of the current campground author
    2. get all the notifications related to the campground being deleted
    3. loop through all the notifications
    4. loop through all the current campground author followers and pull out the notification
    5. delete all notifications documents for the campground ID being deleted
  */
  try {
    let campgroundAuthor = await User.findOne({_id: foundCampground.author.id}).populate('followers').exec();
    let notifications = await Notification.find({campgroundId: campgroundId});

    for(const follower of campgroundAuthor.followers) {
      for(const notification of notifications) {
        follower.notifications.pull(notification);
        await follower.save();
      }
    }  

    await Notification.deleteMany({campgroundId: campgroundId});

  } catch (error) {
    console.log("action :: destroy from notifications campgroundId ", campgroundId);
    console.log(util.getErrorStr(error));
    req.flash("error", "Error removing campground from notifications!");
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
    console.log("action :: destroy comments associated with campgroundId ", campgroundId);
    console.log(util.getErrorStr(error));
    req.flash("error", "Error destroying comments first for the campground");
    return res.redirect("/campgrounds");
  }

  // destroy image uploaded on Cloudinary
  try {
    if(campgroundImagePath) {
      let result = await cloudinary.uploader.destroy(util.getCloudinaryImagePublicId(campgroundImagePath));
    }
  }
  catch (error){
    console.log(util.getErrorStr(error));
  }

  // finally destroy the campground
  try {
    await Campground.deleteMany(searchObject);
  } catch (error) {
    console.log("action :: destroy campgroundId ", campgroundId);
    console.log(util.getErrorStr(error));
    req.flash("error", "Error removing campground! Please try again after some time or report to web admin.");
    return res.redirect("/campgrounds");
  }

  req.flash("success", "Campground removed successfully");
  return res.redirect("/campgrounds");
}

module.exports = campgroundObj;