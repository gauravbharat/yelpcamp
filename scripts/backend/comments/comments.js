"use strict";

let util = require("../general/util"); 
let Campground = util.utilDataModels.Campground;
let Comment = util.utilDataModels.Comment;
let User = util.utilDataModels.User;
let Notification = util.utilDataModels.Notification;

let sanitiseParms = util.sanitiseParms;
let commentObj = {};

commentObj.showNewComment = (req, res) => {
  // find campground by id
  let campgroundId;

  sanitiseParms.inputId = req.params.id;
  sanitiseParms.location = 'commentObj.showNewComment';
  sanitiseParms.option = util.utilConstants.CAMPGROUND_ID;
  
  let redirectPath = util.sanitiseIdentifier(req, res, sanitiseParms);
  if(redirectPath) { return res.redirect(redirectPath); }

  /* if redirectPath is returned undefined or null or blank, outputId is supposed to be returned as
  a valid ObjectId */
  campgroundId = sanitiseParms.outputId;  

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
}

// function to add comment and push it in the associated campground
commentObj.createNewComment = async (req, res) => {
  // lookup campground using ID
  let campgroundId;

  sanitiseParms.inputId = req.params.id;
  sanitiseParms.location = 'commentObj.createNewComment';
  sanitiseParms.option = util.utilConstants.CAMPGROUND_ID;
  
  let redirectPath = await util.sanitiseIdentifier(req, res, sanitiseParms);
  if(redirectPath) { return res.redirect(redirectPath); }

  /* if redirectPath is returned undefined or null or blank, outputId is supposed to be returned as
  a valid ObjectId */
  campgroundId = sanitiseParms.outputId;  

  let searchObject = { _id: campgroundId};
  req.body.comment.text = req.sanitize(req.body.comment.text);
  let newCommentData = req.body.comment;

  let foundCampground;

  try {
    foundCampground = await Campground.findOne(searchObject);
    // console.log(fileName + ": addComment : found campground id " + searchObject); 
  } catch(error) {
    console.log(util.getErrorStr(error));
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
    await newComment.save((err) => {
      if(err) {
        let error = "Something bad happened saving comment!";
        req.flash("error", error);
        console.log(err);
      }
    });

    foundCampground.comments.push(newComment);
    await foundCampground.save((err) => {
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
      // Send notificationType = 1, for new user comment on campground
      let newNotification = {
        username: req.user.username,
        campgroundId: foundCampground._id,
        commentId: newComment._id,
        campgroundName: foundCampground.name,
        userId: req.user._id,
        notificationType: util.utilConstants.NOTIFY_NEW_COMMENT
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

    req.flash("success", "Successfully added comment!");
    res.redirect("/campgrounds/" + campgroundId);
  } catch(error) {
    console.log(util.getErrorStr(error));
    req.flash("error", "Something bad happened adding comment to campground! " + error.message);
    res.redirect("/campgrounds/" + campgroundId);
  }
};

commentObj.editComment = (req, res) => {
  let commentId;

  sanitiseParms.inputId = req.params.comment_id;
  sanitiseParms.location = 'commentObj.editComment';
  sanitiseParms.option = util.utilConstants.COMMENT_ID;
  
  let redirectPath = util.sanitiseIdentifier(req, res, sanitiseParms);
  if(redirectPath) { 
    return res.redirect(`/campgrounds/${req.params.id}`); 
  }

  /* if redirectPath is returned undefined or null or blank, outputId is supposed to be returned as
  a valid ObjectId */
  commentId = sanitiseParms.outputId;  

  let commentSearch = { _id: commentId};

  Comment.findOne(commentSearch, (err, foundComment) => {
    if(err) {
      req.flash("error", "Comment not found!");
      return res.redirect(`/campgrounds/${req.params.id}`); 
    } else {
      res.render("comments/edit", {
        campground_id: req.params.id,
        comment: foundComment 
      });
    }
  });
}

commentObj.updateComment = async (req, res) => {
  let commentId;

  sanitiseParms.inputId = req.params.comment_id;
  sanitiseParms.location = 'commentObj.updateComment';
  sanitiseParms.option = util.utilConstants.COMMENT_ID;
  
  let redirectPath = await util.sanitiseIdentifier(req, res, sanitiseParms);
  if(redirectPath) { return res.redirect(redirectPath); }

  /* if redirectPath is returned undefined or null or blank, outputId is supposed to be returned as
  a valid ObjectId */
  commentId = sanitiseParms.outputId;  

  let commentSearch = { _id: commentId};

  req.body.comment.text = req.sanitize(req.body.comment.text);
  req.body.comment.isEdited = true;

  await Comment.findOneAndUpdate(commentSearch, req.body.comment, (err) => {
    if(err) { 
      req.flash("error", "Error updating comment. Please try again after some time");
      return res.redirect("back");
    } else {
      req.flash("success", "Comment updated.");
      return res.redirect(`/campgrounds/${req.params.id}`);
    }
  });
}

commentObj.deleteComment = async (req, res) => {
  // function to remove comment and pull it from associated campground
  let commentId;
  let campgroundId;

  sanitiseParms.inputId = req.params.id;
  sanitiseParms.location = 'commentObj.deleteComment';
  sanitiseParms.option = util.utilConstants.CAMPGROUND_ID;
  
  let redirectPath = await util.sanitiseIdentifier(req, res, sanitiseParms);
  if(redirectPath) { return res.redirect(redirectPath); }

  /* if redirectPath is returned undefined or null or blank, outputId is supposed to be returned as
  a valid ObjectId */
  campgroundId = sanitiseParms.outputId;  
  let searchObject = { _id: campgroundId};

  sanitiseParms.inputId = req.params.comment_id;
  sanitiseParms.location = 'commentObj.deleteComment';
  sanitiseParms.option = util.utilConstants.COMMENT_ID;
  
  redirectPath = await util.sanitiseIdentifier(req, res, sanitiseParms);
  if(redirectPath) { return res.redirect(redirectPath); }
  commentId = sanitiseParms.outputId;  
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
    console.log("action :: destroy from notifications commentId ", commentId);
    console.log(util.getErrorStr(error));
    req.flash("error", "Error removing comment from notifications!");
  }
  /* 09032020 - Gaurav - Remove notification traces when comment is deleted - End */

  // destroy comment
  try {
    await Comment.deleteMany(commentSearch);
  } catch (error) {
    console.log("action :: destroy commentId ", commentId);
    console.log(util.getErrorStr(error));
    req.flash("error", "Error removing comment! Please try again after some time or report to web admin.");
    return res.redirect(`/campgrounds/${req.params.id}`);
  }

  // remove destroyed comment from associated campground
  try {
    await Campground.findOneAndUpdate(
      searchObject,
      { $pull: { comments: commentId } }
    );
  } catch (error) {
    console.log("action :: pull destroyed comment and update campgroundId ", campgroundId);
    console.log(util.getErrorStr(error));
    req.flash("error", "Error removing comment from associated campground! Please try again after some time or report to web admin.");
    return res.redirect(`/campgrounds/${req.params.id}`);
  }

  req.flash("success", "Comment deleted");
  return res.redirect(`/campgrounds/${req.params.id}`);
}



module.exports = commentObj;