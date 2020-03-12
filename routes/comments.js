// ========================
// COMMENT ROUTES
// ========================

var express = require("express");
const mongoose = require("mongoose");
var router = express.Router({mergeParams: true});
const fileName = "comments.js";

var Campground = require("../models/campground");
var Comment = require("../models/comment");
var Notification = require("../models/notification");
var User = require("../models/user");
var middleware = require("../middleware"); // defaults to index.js

// Comments New
router.get("/new", middleware.isLoggedIn, (req, res) => {
  // find campground by id
  let campgroundId;

  if(mongoose.Types.ObjectId.isValid(req.params.id)) {
    campgroundId = mongoose.Types.ObjectId(req.params.id);
  } else {
    req.flash("error", "Campground ID is invalid!");
    console.log("* " + middleware.getLogStr(
        "comments.js.new", 
        "campground ID",
        req.params.id,
        req
    ));
    return res.redirect("/campgrounds");
  }

  var searchObject = { _id: campgroundId};

  Campground.findOne(searchObject, function(err, foundCampground){
    if(err || !foundCampground){
      console.log(err);
      req.flash("error", "Campground not found!");
      res.send(err);
    } else {
        // console.log(foundCampground);
        // render show template with that campground
      res.render("comments/new", {campground: foundCampground});
    }
  });
});

// Comments Create
router.post("/", middleware.isLoggedIn, (req, res) => {
  addComment(req, res);
});

// EDIT COMMENT ROUTE
router.get("/:comment_id/edit", middleware.checkCommentOwnership, (req, res) => {
  let commentId;
  if(mongoose.Types.ObjectId.isValid(req.params.comment_id)) {
    commentId = mongoose.Types.ObjectId(req.params.comment_id);
  } else {
    req.flash("error", "Comment ID is invalid!");
    console.log("* " + middleware.getLogStr(
        "comments.js.edit", 
        "comment ID",
        req.params.comment_id,
        req
    ));
    return res.redirect("/campgrounds/" + req.params.id);
  }    

  let commentSearch = { _id: commentId};

  Comment.findOne(commentSearch, (err, foundComment) => {
    if(err) {
      req.flash("error", "Comment not found!");
      return res.redirect("/campgrounds/" + req.params.id);
    } else {
      res.render("comments/edit", {
        campground_id: req.params.id,
        comment: foundComment 
      });
    }
  });
});

// UPDATE COMMENT ROUTE
router.put("/:comment_id", middleware.checkCommentOwnership, (req, res) => {
  let commentId;
  if(mongoose.Types.ObjectId.isValid(req.params.comment_id)) {
    commentId = mongoose.Types.ObjectId(req.params.comment_id);
  } else {
    req.flash("error", "Comment ID is invalid!");
    console.log("* " + middleware.getLogStr(
        "comments.js.put", 
        "comment ID",
        req.params.comment_id,
        req
    ));
    return res.redirect("back");
  }   

  let commentSearch = { _id: commentId};

  req.body.comment.text = req.sanitize(req.body.comment.text);
  req.body.comment.isEdited = true;

  Comment.findOneAndUpdate(commentSearch, req.body.comment, (err) => {
    if(err) { 
      req.flash("error", "Error updating comment. Please try again after some time");
      res.redirect("back");
    } else {
      req.flash("success", "Comment updated.");
      res.redirect("/campgrounds/" + req.params.id);
    }
  });
});

// DESTROY COMMENT ROUTE
router.delete("/:comment_id", middleware.checkCommentOwnership, (req, res) => {
  destroyComment(req, res);
});

// function to add comment and push it in the associated campground
async function addComment(req, res) {
  // lookup campground using ID
  let campgroundId;

  if(mongoose.Types.ObjectId.isValid(req.params.id)) {
    campgroundId = await mongoose.Types.ObjectId(req.params.id);
  } else {
    req.flash("error", "Campground ID is invalid!");
    console.log("* " + middleware.getLogStr(
        "comments.js.addComment", 
        "campground ID",
        req.params.id,
        req
    ));
    return res.redirect("/campgrounds");
  }

  // console.log("inside addComment : campgroundId = " + campgroundId);

  var searchObject = { _id: campgroundId};
  // console.log("inside addComment : searchObject = " + searchObject);
  req.body.comment.text = req.sanitize(req.body.comment.text);
  var newCommentData = req.body.comment;
  // console.log("inside addComment : newCommentData = " + newCommentData);

  var foundCampground;

  try {
    foundCampground = await Campground.findOne(searchObject);
    // console.log(fileName + ": addComment : found campground id " + searchObject); 
  } catch(error) {
    console.log(middleware.getErrorStr(error));
    req.flash("error", "Campground not found!");
    return res.redirect("/campgrounds");
  }    

  try {
    let newComment = await Comment.create(newCommentData);
    // console.log(fileName + ": addComment : created new comment");

    // add username and id to comment
    newComment.author.id = req.user._id;
    newComment.author.username = req.user.username;
    newComment.author.avatar = req.user.avatar; //03062020 - Gaurav - added avatar to display user image on comments
    // save comment
    newComment.save((err) => {
      if(err) {
        let error = "Something bad happened saving comment!";
        req.flash("error", error);
        console.log(err);
      }
    });

    foundCampground.comments.push(newComment);
    foundCampground.save((err) => {
      if(err) {
        let error = "Something bad happened adding comment to campground!";
        req.flash("error", error);
        console.log(err);
      }
    });

    /* 09032020 - Gaurav - Add notification when a comment is added 
      1. confirm that the campground author and the comment author are not the same
      2. find the campground author ID
      3. create a notification with the username, campground ID and name, comment ID and user ID
      4. update the notifications array for the campground author (user) 
    */
    if (!foundCampground.author.id.equals(req.user._id)) {
      let newNotification = {
        username: req.user.username,
        campgroundId: foundCampground._id,
        commentId: newComment._id,
        campgroundName: foundCampground.name,
        userId: req.user._id
      };
      let foundUser = await User.findOne({_id: foundCampground.author.id});
      if(foundUser) {
        let notification = await Notification.create(newNotification);

        // Push notification to the campground author
        let campgroundAuthor = await User.findOne({_id: foundCampground.author.id});
        campgroundAuthor.notifications.push(notification);
        await campgroundAuthor.save((err) => {
          if(err) {
            let error = "Something bad happened pushing new comment notification to campground author!";
            req.flash("error", error);
            console.log(err);
          }
        });
      }
    }  
    // Add comment, campgroundId and campgroundName to notifactions - End

    // console.log(fileName + ": addComment : : added comment for " + foundCampground.name);
    req.flash("success", "Successfully added comment!");
    res.redirect("/campgrounds/" + campgroundId);
  } catch(error) {
    console.log(middleware.getErrorStr(error));
    req.flash("error", "Something bad happened adding comment to campground! " + error.message);
    res.redirect("/campgrounds/" + campgroundId);
  }
};

// function to remove comment and pull it from associated campground
async function destroyComment(req, res) {
  let commentId;
  let campgroundId;

  if(mongoose.Types.ObjectId.isValid(req.params.id)) {
    campgroundId = await mongoose.Types.ObjectId(req.params.id);
    if(res.locals.debugMode) { console.log(middleware.now() + "campgroundId= " + campgroundId); }
  } else {
    req.flash("error", "Campground ID is invalid!");
    console.log("* " + middleware.getLogStr(
        "comment.js.delete", 
        "campground ID",
        req.params.id,
        req
    ));
    return res.redirect("/campgrounds");
  }

  let searchObject = { _id: campgroundId};

  if(mongoose.Types.ObjectId.isValid(req.params.comment_id)) {
    commentId = await mongoose.Types.ObjectId(req.params.comment_id);
  } else {
    req.flash("error", "Comment ID is invalid!");
    console.log("* " + middleware.getLogStr(
      "comments.js.delete", 
      "comment ID",
      req.params.comment_id,
      req
    ));
    return res.redirect("back");
  }   

  let commentSearch = { _id: commentId};

  /* 09032020 - Gaurav - Remove notification traces when comment is deleted
    1. get the author.id for the campground to remove the notification from
    2. get all the notification documents for the COMMENT ID (NOT THE CAMPGROUND ID) to delete
    3. loop through all the notification documents and pull each one from the Users collection
    4. delete all notifications for the comment ID to delete
    */
  try {
    let foundCampground = await Campground.findOne(searchObject);
    
    if(foundCampground) {
      let campgroundAuthorId = foundCampground.author.id;

      // loop through notifications and pull each one out from the Comment author(user) collection
      let notifications = await Notification.find({commentId: commentId});

      for(const notification of notifications) {
        let notificationId = notification._id;
        await User.findOneAndUpdate(
          {_id: campgroundAuthorId},
          { $pull: { notifications: notificationId } }
        );
      }
      // remove comments from notifications collection
      await Notification.deleteMany({commentId: commentId});
    }  
  } catch (error) {
    console.log("action :: destroy from notifications commentId " + commentId);
    console.log(middleware.getErrorStr(error));
    req.flash("error", "Error removing comment from notifications!");
  }
  /* 09032020 - Gaurav - Remove notification traces when comment is deleted - End */

  // destroy comment
  try {
    await Comment.deleteMany(commentSearch);
  } catch (error) {
    console.log("action :: destroy commentId " + commentId);
    console.log(middleware.getErrorStr(error));
    req.flash("error", "Error removing comment! Please try again after some time or report to web admin.");
    return res.redirect("/campgrounds/" + req.params.id);
  }

  // remove destroyed comment from associated campground
  try {
    await Campground.findOneAndUpdate(
      searchObject,
      { $pull: { comments: commentId } }
    );
  } catch (error) {
    console.log("action :: pull destroyed comment and update campgroundId " + campgroundId);
    console.log(middleware.getErrorStr(error));
    req.flash("error", "Error removing comment from associated campground! Please try again after some time or report to web admin.");
    return res.redirect("/campgrounds/" + req.params.id);
  }

  req.flash("success", "Comment deleted");
  res.redirect("/campgrounds/" + req.params.id);
};

module.exports = router;