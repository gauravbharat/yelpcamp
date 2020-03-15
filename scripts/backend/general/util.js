"use strict";

const mongoose = require("mongoose");

let User = require("../../../models/user");

const USER_ID = 'USER_ID';
const COMMENT_ID = 'COMMENT_ID';
const CAMPGROUND_ID = 'CAMPGROUND_ID';
const NOTIFICATION_ID = 'NOTIFICATION_ID';

let utilityObj = {};

utilityObj.sanitiseIdentifier = (req, res, obj) => {
  let errorMessage = '';
  let invalidField = '';
  let redirectTo = undefined;
  obj.outputId = undefined;

  if(mongoose.Types.ObjectId.isValid(obj.inputId)) {
    obj.outputId = mongoose.Types.ObjectId(obj.inputId);
  } else {

    switch(obj.option) {
      case USER_ID:
        errorMessage = 'User ID is invalid!';
        invalidField = 'user Id';
        redirectTo = '/campgrounds';
        break;
      case COMMENT_ID:
        errorMessage = 'Comment ID is invalid!';
        invalidField = 'comment Id';
        redirectTo = '/back';
        break;
      case CAMPGROUND_ID:
        errorMessage = 'Campground ID is invalid!';
        invalidField = 'campground Id';
        redirectTo = '/campgrounds';
        break;

      case NOTIFICATION_ID:
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
      totalCount = await User.countDocuments(searchObject);
    } else {
      // all
      totalCount = await User.countDocuments({});
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
    foundCampground = await Campground.findOne(searchObject);
  } catch(error) {
    console.log(middlewareObj.getErrorStr(error));
    foundCampground = null;
  }
  return foundCampground;
};

async function findComment (searchObject) {
  var foundComment;
  try {
    foundComment = await Comment.findOne(searchObject);
  } catch(error) {
    console.log(middlewareObj.getErrorStr(error));
    foundComment = null;
  }

  return foundComment;
};

module.exports = utilityObj;