const mongoose = require("mongoose");
var Campground = require("../models/campground");
var Comment = require("../models/comment");

// all middleware goes here
var middlewareObj = {};

middlewareObj.checkCampgroundOwnership = (req, res, next) => {
    // console.log(req.method);

    // is user logged in?
    if(req.isAuthenticated()){
        // find the campground with the provided ID in the route
        let campgroundId;

        if(mongoose.Types.ObjectId.isValid(req.params.id)) {
            campgroundId = mongoose.Types.ObjectId(req.params.id);
        } else {
            req.flash("error", "Campground ID is invalid!");
            console.log("* " + middlewareObj.getLogStr(
                "index.js.checkCampgroundOwnership", 
                "campground ID",
                req.params.id,
                req
            ));
            return res.redirect("/campgrounds");
        }

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

        if(mongoose.Types.ObjectId.isValid(req.params.id)) {
            campgroundId = mongoose.Types.ObjectId(req.params.id);
        } else {
            req.flash("error", "Campground ID is invalid!");
            console.log("* " + middlewareObj.getLogStr(
                "index.js.checkCommentOwnership", 
                "campground ID",
                req.params.id,
                req
            ));
            return res.redirect("/campgrounds");
        }

        if(mongoose.Types.ObjectId.isValid(req.params.comment_id)) {
            commentId = mongoose.Types.ObjectId(req.params.comment_id);
        } else {
            req.flash("error", "Comment ID is invalid!");
            console.log("* " + middlewareObj.getLogStr(
                "index.js.checkCommentOwnership", 
                "comment ID",
                req.params.comment_id,
                req
            ));
            return res.redirect("/campgrounds/" + campgroundId);
        }

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
                                if(res.locals.debugMode) { console.log(middlewareObj.now() + "PASSED req.method == DELETE inside checkCommentOwnership");}
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
                        if(res.locals.debugMode) { console.log(middlewareObj.now() + "PASSED line 123 inside checkCommentOwnership");}
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
    req.flash("error", "You need to be logged in to do that!");
    res.redirect("/login");
};

middlewareObj.now = () => {
    return (new Date()).toString();
};

middlewareObj.getLogStr = (pEventLocation, pInvalidField, pInvalidID, req) => {
        
    let username = "unknown";
    let userid = "unknown";

    if(!pInvalidID) { pInvalidID = "null"};

    if(req.user){
        username = req.user.username;
        userid = req.user._id;
    }

    let retStr = middlewareObj.now() + 
        " :: inside " + pEventLocation + 
        " : " + pInvalidField + " " + pInvalidID + 
        " is passed invalid for username " + username + 
        " and user ID " + userid;
    
    return retStr;    

};

async function findCampground (searchObject) {
        var foundCampground;
        try {
            foundCampground = await Campground.findOne(searchObject);
        } catch {
            console.log(err);
            foundCampground = null;
        }
        return foundCampground;
};

async function findComment (searchObject) {
    var foundComment;
    try {
        foundComment = await Comment.findOne(searchObject);
    } catch {
        console.log(err);
        foundComment = null;
    }

    return foundComment;
};

module.exports = middlewareObj;