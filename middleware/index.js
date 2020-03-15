"use strict";
const mongoose = require("mongoose");
const COMMENT_ID = 'COMMENT_ID';
const CAMPGROUND_ID = 'CAMPGROUND_ID';

let Campground = require("../models/campground");
let Comment = require("../models/comment");
let util = require("../scripts/backend/general/util"); 
let sanitiseParms = {
  inputId: String
, location: String
, option: String
, outputId: undefined
}

// all middleware goes here
let middlewareObj = {};

middlewareObj.checkCampgroundOwnership = (req, res, next) => {
    // console.log(req.method);

  // is user logged in?
  if(req.isAuthenticated()){
    // find the campground with the provided ID in the route
    let campgroundId;

    sanitiseParms.inputId = req.params.id;
    sanitiseParms.location = 'middlewareObj.checkCampgroundOwnership';
    sanitiseParms.option = CAMPGROUND_ID;
    let redirectPath = util.sanitiseIdentifier(req, res, sanitiseParms);
    if(redirectPath) { return res.redirect(redirectPath); }
    /* if redirectPath is returned undefined or null or blank, outputId is supposed to be returned as
    a valid ObjectId */
    campgroundId = sanitiseParms.outputId;  
    let searchObject = { _id: campgroundId};

    Campground.findOne(searchObject, (err, foundCampground) => {
      if(err || !foundCampground){
        req.flash("error", "Campground not found!");
        res.redirect("/campgrounds");
      } else {
        // does user own the campground?
        if((foundCampground.author.id.equals(req.user._id)) || req.user.isAdmin){
          next();
        } else {
          req.flash("error", "You don't have permission to do that!");
          // res.redirect("back");
          res.redirect("/campgrounds/" + req.params.id);
        }
      }
    });    
  } else {
    req.flash("error", "You need to be logged in to do that!");
    res.redirect("/login");
  }
};

middlewareObj.checkCommentOwnership = (req, res, next) => {
    // is user logged in?
  if(req.isAuthenticated()){
    // find the campground with the provided ID in the route
    let campgroundId;
    let commentId;

    sanitiseParms.inputId = req.params.id;
    sanitiseParms.location = 'middlewareObj.checkCommentOwnership';
    sanitiseParms.option = CAMPGROUND_ID;
    let redirectPath = util.sanitiseIdentifier(req, res, sanitiseParms);
    if(redirectPath) { return res.redirect(redirectPath); }
    campgroundId = sanitiseParms.outputId; 

    sanitiseParms.inputId = req.params.comment_id;
    sanitiseParms.location = 'middlewareObj.checkCommentOwnership';
    sanitiseParms.option = COMMENT_ID;
    redirectPath = util.sanitiseIdentifier(req, res, sanitiseParms);
    if(redirectPath) { return res.redirect(redirectPath); }
    commentId = sanitiseParms.outputId; 

    let searchObject = { _id: campgroundId};
    let commentSearch = { _id: commentId};

    // Either the campground author, the admin or the comment author, can delete the comment
    if(req.method == "DELETE") {
        Campground.findOne(searchObject, (err, foundCampground) => {
          if(err || !foundCampground){
            //code below
            req.flash("error", "Campground not found!");
            return res.redirect("/campgrounds");
          } else {
            Comment.findOne(commentSearch, (err, foundComment) => {
              if(err || !foundComment){
                // code below
                req.flash("error", "Comment not found!");
                return res.redirect("/campgrounds/" + campgroundId);
              } else {
                if((foundComment.author.id.equals(req.user._id)) || (foundCampground.author.id.equals(req.user._id)) || req.user.isAdmin){
                  if(res.locals.debugMode) { console.log(util.now(), "PASSED req.method == DELETE inside checkCommentOwnership");}
                  next();
                } else {
                  req.flash("error", "You don't have permission to do that!");
                  res.redirect("back");
                }
              }
            }); 
          }
        });    
      } else {
        Comment.findOne(commentSearch, (err, foundComment) => {
          if(err || !foundComment){
            // code below
            req.flash("error", "Comment not found!");
            return res.redirect("/campgrounds/" + campgroundId);
          } else {
            // ONLY the admin or the comment author, can edit the comment
            if((foundComment.author.id.equals(req.user.id)) || req.user.isAdmin) {
              if(res.locals.debugMode) { console.log(util.now(), "PASSED line 123 inside checkCommentOwnership");}
              next();
            } else {
              req.flash("error", "You don't have permission to do that!");
              res.redirect("back");
            }
          }
        });  
      } 
  } else {
    req.flash("error", "You need to be logged in to do that!");
    res.redirect("/login");
  }
};

// middleware
// before rendering campgrounds page, check whether the user is logged in
// call this function as a middleware in the get call to campgrounds
middlewareObj.isLoggedIn = (req, res, next) => {
  if(req.isAuthenticated()){
      return next();
  }

  req.session.redirectTo = req.originalUrl;
  
  // 03072020 - Gaurav - Redirect to the user show page instead of the modal window,
  // if that is what the last option that user had clicked on.
  if(req.originalUrl) {
    let pos = req.originalUrl.indexOf('/inCampComModal');
    if(pos > 0) {
      // Remove the '/inCampComModal' suffix
      req.session.redirectTo = req.originalUrl.slice(0, pos);
    }  
  }
  // 03072020 - Gaurav - End

  req.flash("error", "You need to be logged in to do that!");
  res.redirect("/login");
};

module.exports = middlewareObj;