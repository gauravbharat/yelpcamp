"use strict";

const mongoose = require("mongoose");

let models = Object.freeze({
    User: require("../../../models/user")
  , Campground: require("../../../models/campground")
  , Comment: require("../../../models/comment")
  , Notification: require("../../../models/notification")
});

const constants = Object.freeze({
    USER_ID: 'USER_ID'
  , COMMENT_ID: 'COMMENT_ID'
  , CAMPGROUND_ID: 'CAMPGROUND_ID'
  , NOTIFICATION_ID: 'NOTIFICATION_ID'
  , USER_ADMIN_OPTIONS: 'USER_ADMIN_OPTIONS'
  , USER_AVATAR: 'USER_AVATAR'
  , USER_INFO: 'USER_INFO'
  , USER_PASSWORD_CHANGE: 'USER_PASSWORD_CHANGE'
  , DEFAULT_AVATAR_URL: 'https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcQJS3-GoTF9xqAIyRROWdTD8SUihnSdP5Ac2uPb6AzgGHHyeuuD'
  , NOTIFY_NEW_CAMPGROUND: 0
  , NOTIFY_NEW_COMMENT: 1
  , NOTIFY_USER_ADMIN_REQ: 2
  , CREATE: 'CREATE'
  , UPDATE: 'UPDATE'
  , DELETE: 'DELETE'
});

let utilityObj = {};

utilityObj.sanitiseParms = {
    inputId: String
  , location: String
  , option: String
  , outputId: undefined
};

utilityObj.sanitiseIdentifier = (req, res, obj) => {
  let errorMessage = '';
  let invalidField = '';
  let redirectTo = undefined;
  obj.outputId = undefined;

  if(mongoose.Types.ObjectId.isValid(obj.inputId)) {
    obj.outputId = mongoose.Types.ObjectId(obj.inputId);
  } else {

    switch(obj.option) {
      case constants.USER_ID:
        errorMessage = 'User ID is invalid!';
        invalidField = 'user Id';
        redirectTo = '/campgrounds';
        break;
      case constants.COMMENT_ID:
        errorMessage = 'Comment ID is invalid!';
        invalidField = 'comment Id';
        redirectTo = '/back';
        break;
      case constants.CAMPGROUND_ID:
        errorMessage = 'Campground ID is invalid!';
        invalidField = 'campground Id';
        redirectTo = '/campgrounds';
        break;

      case constants.NOTIFICATION_ID:
        errorMessage = 'Notification ID is invalid!';
        invalidField = 'notification Id';
        redirectTo = '/back';
        break;  
      default:
    }

    req.flash("error", errorMessage);
    console.log("* " + utilityObj.getLogStr(
      obj.location
      , invalidField
      , obj.inputId
      , req
    ));
  }  
  return redirectTo;
}

utilityObj.now = () => {
  return (new Date()).toString();
};

utilityObj.getLogStr = (pEventLocation, pInvalidField, pInvalidID, req) => {
        
  let username = "unknown";
  let userid = "unknown";

  if(!pInvalidID) { pInvalidID = "null"};

  if(req.user){
    username = req.user.username;
    userid = req.user._id;
  }

  let retStr = utilityObj.now() + 
    " :: inside " + pEventLocation + 
    " : " + pInvalidField + " " + pInvalidID + 
    " is passed invalid for username " + username + 
    " and user ID " + userid;
  
  return retStr;    

}

/* 03122020 - Gaurav - Return a formatted error string for the returned data */
utilityObj.getErrorStr = (p_err) => {
  return `${(new Date()).toString()} \nError name: ${p_err.message} \nError message: ${p_err.message}`;
}

utilityObj.getUsersCount = async (searchObject) => {
  let totalCount = 0;

  try {
    if(searchObject) {
      //specific
      totalCount = await models.User.countDocuments(searchObject);
    } else {
      // all
      totalCount = await models.User.countDocuments({});
    }  
  } catch (error) {
    console.log(utilityObj.getErrorStr(error));
  }

  return totalCount;
}

utilityObj.escapeRegex = (text) => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

utilityObj.getCloudinaryImagePublicId = (strPath) => {
  // Extract Cloudinary image public Id from the path
  if(strPath) {
    let slice1 = strPath.slice(strPath.lastIndexOf("/") + 1);
    let publicId = slice1.slice(0, slice1.lastIndexOf("."));
    return publicId;
  } 
  return null;
};

async function findCampground (searchObject) {
  var foundCampground;
  try {
    foundCampground = await models.Campground.findOne(searchObject);
  } catch(error) {
    console.log(middlewareObj.getErrorStr(error));
    foundCampground = null;
  }
  return foundCampground;
};

async function findComment (searchObject) {
  var foundComment;
  try {
    foundComment = await models.Comment.findOne(searchObject);
  } catch(error) {
    console.log(middlewareObj.getErrorStr(error));
    foundComment = null;
  }

  return foundComment;
};

/* ORDER MATTERS! Export individual object/s after utilityObj */
module.exports = utilityObj;
module.exports.utilConstants = constants;
module.exports.utilDataModels = models;
