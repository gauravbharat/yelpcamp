"use strict";

const nodemailer = require("nodemailer");

let util = require("../general/util"); 
let Campground = util.utilDataModels.Campground;
let Comment = util.utilDataModels.Comment;
let User = util.utilDataModels.User;
let Notification = util.utilDataModels.Notification;

let sanitiseParms = util.sanitiseParms;
// all user profile (show, follow, update, notifications, etc.) related logic goes here
let userObj = {};

userObj.showUser = (req, res) => {
  res.redirect(`/users/${req.params.id}/modeless-xiKAF7m2PonmHIOv8cootxC0KQ=`);
}

userObj.showUserExtended = async (req, res) => {
  let userId;
  let foundUser;
  let foundCampgrounds;

  sanitiseParms.inputId = req.params.id;
  sanitiseParms.location = 'userObj.showUserExtended';
  sanitiseParms.option = util.utilConstants.USER_ID;
  
  let redirectPath = await util.sanitiseIdentifier(req, res, sanitiseParms);
  if(redirectPath) { return res.redirect(redirectPath); }

  /* if redirectPath is returned undefined or null or blank, outputId is supposed to be returned as
  a valid ObjectId */
  userId = sanitiseParms.outputId;  

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
    console.log(util.getErrorStr(error));
    return res.redirect("/campgrounds");
  }

  // find campgrounds for that user
  try {
    foundCampgrounds = await Campground.find().where('author.id').equals(foundUser._id).exec();
  } catch (error) {
    req.flash("error", "Error fetching campgrounds for user profile. " + error.message);
    console.log(util.getErrorStr(error));
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
    console.log(util.getErrorStr(error));
  }

  if(req.params.window === 'inCampComModal') {
    res.render("users/showmodal", { blogUser: foundUser, campgrounds: foundCampgrounds });
  } else {
    res.render("users/show", { blogUser: foundUser, campgrounds: foundCampgrounds }); 
  }  
}

userObj.updateAdminOptions = (req, res) => {
  updateUser(req, res, util.utilConstants.USER_ADMIN_OPTIONS);
}

userObj.updateUserAvatar = (req, res) => {
  updateUser(req, res, util.utilConstants.USER_AVATAR);
}

userObj.updateUserInfo = (req, res) => {
  updateUser(req, res, util.utilConstants.USER_INFO);
}

userObj.changeUserPassword = (req, res) => {
  updateUser(req, res, util.utilConstants.USER_PASSWORD_CHANGE);
}

async function updateUser(req, res, option) {
  let userId;
  let errorPrefix = '';
  let logPrefix = '';
  let successMessage = '';

  if(option === util.utilConstants.USER_ADMIN_OPTIONS && !req.user.isAdmin) {
    req.flash("error", "You need to be an administrator to set these user options!");
    return res.redirect("back");
  }

  if(req.body) {
    sanitiseParms.inputId = req.params.id;
    sanitiseParms.location = 'userObj.updateUser';
    sanitiseParms.option = util.utilConstants.USER_ID;
    
    let redirectPath = await util.sanitiseIdentifier(req, res, sanitiseParms);
    if(redirectPath) { return res.redirect(redirectPath); }

    /* if redirectPath is returned undefined or null or blank, outputId is supposed to be returned as
    a valid ObjectId */
    userId = sanitiseParms.outputId;  

    let userSearch = { _id: userId};

    try {
      let updateFields = {};
      let avatar = '';
      let commentAuthorSearch = '';
      let commentAuthorUpdate = '';
      let notificationQuery;

      switch(option) {
        case util.utilConstants.USER_ADMIN_OPTIONS:
          errorPrefix = 'Error updating admin fields: ';
          logPrefix = errorPrefix + '\n';
          successMessage = 'Admin fields updated';

          if(req.body.isAdmin) { 
            updateFields.isAdmin = true;
            updateFields.isRequestedAdmin = false;
            
            notificationQuery = {
              userId: userId 
            , notificationType: util.utilConstants.NOTIFY_USER_ADMIN_REQ  
            };

          } else {
            updateFields.isAdmin = false;
          }
    
          if(req.body.isPublisher) { 
            updateFields.isPublisher = true;
          } else {
            updateFields.isPublisher = false;
          }
          break;
        case util.utilConstants.USER_INFO:  

          errorPrefix = 'Error updating user information: ';
          logPrefix = errorPrefix + '\n';
          successMessage = 'User information updated';

          // Values fields are populated for these fields. So, default values
          // are expected to come back unless specifically cleared out
          if(req.body.firstName) { 
            updateFields.firstName = req.body.firstName.trim();
          } else {
            updateFields.firstName = '';
          }

          if(req.body.lastName) { 
            updateFields.lastName = req.body.lastName.trim();
          } else {
            updateFields.lastName = '';
          }

          // Required field on the UI
          if(req.body.email) { 
            updateFields.email = req.body.email.trim();
          }
          
          break;
        case util.utilConstants.USER_AVATAR:
          errorPrefix = 'Error updating Avatar: ';
          logPrefix = errorPrefix + '\n';
          successMessage = 'User avatar updated';

          if(!req.body.avatar) {
            avatar = '';
          } else {
            avatar = req.body.avatar.trim();
          }

          if(avatar === '') {
            avatar = util.utilConstants.DEFAULT_AVATAR_URL;
          }

          updateFields.avatar = avatar;
          commentAuthorSearch = { "author.id": userId };
          commentAuthorUpdate = { "author.avatar": avatar };

          break;
        case util.utilConstants.USER_PASSWORD_CHANGE:
          errorPrefix = 'Error changing user password: ';
          logPrefix = errorPrefix + '\n';
          successMessage = 'Your password has been changed successfully. Please login again with your new password.';

          // verify user's old password is correct
          let currentUser = await User.authenticate()(req.user.username, req.body.oldpassword);

          // if(JSON.stringify(currentUser.user) === 'false') {
          if(currentUser.error) {  
            req.flash("error", 'Old password was incorrect. Try changing password again with the correct current password.');
            return res.redirect("back");
          }
          
          //get user db document handle
          let user = await User.findOne(userSearch);
          if(!user) {
            req.flash('error', 'Error fetching user information from the database!');
            return res.redirect("back");
          }

          // change password
          let changePwd = await user.changePassword(req.body.oldpassword, req.body.newpassword);
          if(changePwd.error) {
            req.flash('error', 'Error updating new password!');
            return res.redirect("back");
          }
        
          break;
        default:
          console.log("No functionality option passed for function updateUser() in userprofile.js!");
          return res.redirect("back");
      }

      if(option === util.utilConstants.USER_PASSWORD_CHANGE) {
        // Force user to logout and login again with the new password
        await req.logOut();
        req.flash("success", successMessage);
        return res.redirect("/login");
      } else {
        let updatedUser= await User.findOneAndUpdate(userSearch, updateFields);
      }  

      if(option === util.utilConstants.USER_AVATAR) {
        /* update comment author avatar path to show the updated avatar for the current user 
        on all user comments */
        let updatedComments = await Comment.updateMany(commentAuthorSearch, commentAuthorUpdate);
      }

      if(option === util.utilConstants.USER_ADMIN_OPTIONS && notificationQuery) {
        /* 03152020 - Gaurav - Remove any "admin access requested" notifications from 
        each user with admin role */
        await notifyAdminRequest(notificationQuery, util.utilConstants.DELETE);
      }  

    } catch (error) {
      req.flash("error", errorPrefix + error.message );
      console.log(logPrefix, util.getErrorStr(error));
      return res.redirect("back");
    }
  }    
  if(successMessage && successMessage != '') { req.flash("success", successMessage); }
  return res.redirect("/users/" + req.params.id);
}

userObj.followAuthor = async (req, res) => {
  let userId;
  let foundUser;

  sanitiseParms.inputId = req.params.id;
  sanitiseParms.location = 'userObj.followAuthor';
  sanitiseParms.option = util.utilConstants.USER_ID;
  
  let redirectPath = await util.sanitiseIdentifier(req, res, sanitiseParms);
  if(redirectPath) { return res.redirect(redirectPath); }

  /* if redirectPath is returned undefined or null or blank, outputId is supposed to be returned as
  a valid ObjectId */
  userId = sanitiseParms.outputId;  

  let userSearch = { _id: userId};

  try {
    foundUser = await User.findOne(userSearch);
    if(!foundUser) {
        req.flash("error", "User not found!");
        return res.redirect("/campgrounds");
    }
    foundUser.followers.push(req.user._id); // push the user that's logged in
    await foundUser.save();
    req.flash('success', 'Successfully followed ' + foundUser.username + '!');
  } catch (error) {
    req.flash('error', error.message);
  }

  res.redirect('/users/' + req.params.id);
}

userObj.unfollowAuthor = async (req, res) => {
  let userId;

  sanitiseParms.inputId = req.params.id;
  sanitiseParms.location = 'userObj.unfollowAuthor';
  sanitiseParms.option = util.utilConstants.USER_ID;
  
  let redirectPath = await util.sanitiseIdentifier(req, res, sanitiseParms);
  if(redirectPath) { return res.redirect(redirectPath); }

  /* if redirectPath is returned undefined or null or blank, outputId is supposed to be returned as
  a valid ObjectId */
  userId = sanitiseParms.outputId;

  let userSearch = { _id: userId};

  try {
    let foundUser = await User.findOneAndUpdate(
      userSearch,
      { $pull: { followers: req.user._id } } //pull out the user that's logged in
    );

    req.flash('success', 'You have un-followed ' + foundUser.username + '!');
  } catch (error) {
    console.log("action :: pull out un-follower and update UserId ", userId);
    console.log(util.getErrorStr(error));
    req.flash('error', error.message);
  }

  res.redirect('/users/' + req.params.id);
}

userObj.showAllNotifications = async (req, res) => {
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
}

userObj.showNotification = async (req, res) => {
  let notificationId;
  let foundNotification;

  sanitiseParms.inputId = req.params.id;
  sanitiseParms.location = 'userObj.showNotification';
  sanitiseParms.option = util.utilConstants.NOTIFICATION_ID;
  
  let redirectPath = await util.sanitiseIdentifier(req, res, sanitiseParms);
  if(redirectPath) { return res.redirect(redirectPath); }

  /* if redirectPath is returned undefined or null or blank, outputId is supposed to be returned as
  a valid ObjectId */
  notificationId = sanitiseParms.outputId;

  let searchObject = { _id: notificationId};

  try {
    foundNotification = await Notification.findOne(searchObject);
    if(!foundNotification) {
      req.flash("error", "Notification does not exist!")
      return res.redirect("back");
    }
    foundNotification.isRead = true;
    await foundNotification.save();
    switch(foundNotification.notificationType) {
      case util.utilConstants.NOTIFY_NEW_CAMPGROUND:
        return res.redirect(`/campgrounds/${foundNotification.campgroundId}`);
        break;
      case util.utilConstants.NOTIFY_NEW_COMMENT:
        return res.redirect(`/campgrounds/${foundNotification.campgroundId}/${foundNotification.commentId}`)
        break;  
      case util.utilConstants.NOTIFY_USER_ADMIN_REQ:
      default:
        return res.redirect(`/users/${foundNotification.userId}`);
    }
  } catch (error) {
    req.flash("error", error.message);
    console.log(util.getErrorStr(error));
    return res.redirect("back");
  }
}

userObj.deleteNotification = async (req, res) => {
  let notificationId;

  sanitiseParms.inputId = req.params.id;
  sanitiseParms.location = 'userObj.deleteNotification';
  sanitiseParms.option = util.utilConstants.NOTIFICATION_ID;
  
  let redirectPath = await util.sanitiseIdentifier(req, res, sanitiseParms);
  if(redirectPath) { return res.redirect(redirectPath); }

  /* if redirectPath is returned undefined or null or blank, outputId is supposed to be returned as
  a valid ObjectId */
  notificationId = sanitiseParms.outputId;

  let searchObject = { _id: notificationId};

  // remove notification from User collection
  try {
    let foundUser = await User.findOneAndUpdate(
      { _id: req.user._id },
      { $pull: { notifications: notificationId } }
    );
  } catch (error) {
    req.flash('error', error.message);
    console.log(util.getErrorStr(error));
    return res.redirect('back');
  }

  // finally destroy notification from Notifications collection
  try {
    await Notification.deleteMany(searchObject);
  } catch (error) {
    req.flash('error', error.message);
    console.log(util.getErrorStr(error));
    return res.redirect('back');
  }

  req.flash("success", "Notification removed.");
  res.redirect("/notifications");
}

userObj.requestAdminAccess = async (req, res) => {
  let userId;

  sanitiseParms.inputId = req.params.id;
  sanitiseParms.location = 'userObj.requestAdminAccess';
  sanitiseParms.option = util.utilConstants.USER_ID;
  
  let redirectPath = await util.sanitiseIdentifier(req, res, sanitiseParms);
  if(redirectPath) { return res.redirect(redirectPath); }

  /* if redirectPath is returned undefined or null or blank, outputId is supposed to be returned as
  a valid ObjectId */
  userId = sanitiseParms.outputId;

  let userSearch = { _id: userId};
  let updatedUser;

  try {
    let updateFields = {};
    updateFields.isRequestedAdmin = (req.params.option) 

    // console.log(updateFields);
    updatedUser = await User.findOneAndUpdate(userSearch, updateFields);

    if(!updatedUser) {
      req.flash('error', 'Error updating user for admin request!');
      return res.redirect('/users/' + req.params.id);
    }

  } catch (error) {
    console.log("action :: request admin access UserId " + userId);
    console.log(util.getErrorStr(error));
    req.flash('error', error.message);
  }

  try {
    // Send notificationType = 2, for user admin request
    let newNotification = {
      username: req.user.username,
      userId: userId,
      notificationType: util.utilConstants.NOTIFY_USER_ADMIN_REQ
    };

    await notifyAdminRequest(newNotification, util.utilConstants.CREATE);

  } catch (error) {
    console.log("action :: update notifications for admin ");
    console.log(util.getErrorStr(error));
  }

  try {
    let username = req.user.username;
    let firstName = req.user.firstName;
    let lastName = req.user.lastName;
    let userEmail = req.user.email;

    let smtpTransport = await nodemailer.createTransport({
      service: 'Gmail',
      auth: {
          user: 'gaurav.mendse@gmail.com',
          pass: process.env.GMAILPW
      }
    });
    let mailOptions = {
      to: 'gaurav.mendse@icloud.com',
      from: 'gaurav.mendse@gmail.com',
      subject: 'User ' + username + ' requested Administrator access!',
      text: 'Hello Gaurav,\n\n' +
      'This is to inform that the following user has requested an admin access:\n\n' + 
      'username: ' + username + '\n\n' +
      'First Name: ' + firstName + '\n\n' +
      'Last Name: ' + lastName + '\n\n' +
      'Email: ' + userEmail + '\n\n' + 
      "as on " + util.now()
    };
    await smtpTransport.sendMail(mailOptions);

    req.flash('success', 'You have requested Admin access!');
  } catch (error) {
    console.log("action :: request admin access UserId " + userId);
    console.log(util.getErrorStr(error));
    req.flash('error', 'Error sending email to admin gaurav.mendse@icloud.com');
  }

  res.redirect('/users/' + req.params.id);
}

async function notifyAdminRequest(notificationDataObject, option) {
  // loop through all the admins and update their notifications with
  // the user details who requested Admin access
  let admins;
  let errorText;

  try {
    admins = await User.find({"isAdmin": true});

    if(option === util.utilConstants.CREATE) {
      errorText = " Error fetching all users with admin roles in userObj.notifyAdminRequest!";
      for(const admin of admins) {
        let notification = await Notification.create(notificationDataObject);
        admin.notifications.push(notification);
        admin.save();
      }
    } else {
      errorText = " Error deleting all admin request notifications for a user in userObj.notifyAdminRequest!";
      await Notification.deleteMany(notificationDataObject);
    }  
  } catch (error) {
    console.log(util.now(), errorText);
    console.log(util.getErrorStr(error));
    return;    
  }
}

module.exports = userObj;