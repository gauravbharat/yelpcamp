"use strict";

const express = require("express");
const router = express.Router();
const middleware = require("../middleware"); // defaults to middleware/index.js
const access = require("../scripts/backend/general/access"); 
const userProfile = require("../scripts/backend/general/userprofile"); 

// Root route - HOME page
router.get("/", (req, res) => {
  delete req.session.redirectTo; //delete redirect to last page
  res.render("landing");
});

/*
  AUTH ROUTES - START
*/
// show register form
router.get("/register", (req, res) => {
  access.getRegisterForm(req, res);
});

// handle sign up logic
router.post("/register", (req, res) => {
  access.registerUser(req, res);
});

// show login form
router.get("/login", (req, res) => {
  access.showLoginForm(req, res);
});

router.post('/login', (req, res, next) => {
  access.loginUser(req, res, next);
});

// logout route
router.get("/logout", (req, res) => {
  access.logoutUser(req, res);
});

// forgot password
router.get("/forgot", (req, res) => {
  access.showForgotForm(req, res);
});

router.post("/forgot", (req, res, next) => {
  access.postForgotForm(req, res, next);
});

// reset password
router.get("/reset/:token", (req, res) => {
  access.showPasswordResetForm(req, res);
});

router.post('/reset/:token', (req, res) => {
  access.resetPassword(req, res);
});
/* AUTH ROUTES - END */

/*
  USER PROFILE ROUTES - START
*/
router.get("/users/:id", middleware.isLoggedIn, (req, res) => {
  userProfile.showUser(req, res);
});

router.get("/users/:id/:window", middleware.isLoggedIn, (req, res) => {
  userProfile.showUserExtended(req, res);
});

// update Admin options for user
router.put("/users/:id/admin", middleware.isLoggedIn, (req, res) => {
  userProfile.updateAdminOptions(req, res);
});

/* 03072020 - Gaurav - Option to change user Avatar URL */
router.put("/users/:id/avatar", middleware.isLoggedIn, (req, res) => {
  userProfile.updateUserAvatar(req, res);
});
/* 03072020 - Gaurav - Option to change user Avatar URL - End */

/* 03092020 - Gaurav - Option to change user information (firstname, lastname and email) */
router.put("/users/:id/userinfo", middleware.isLoggedIn, (req, res) => {
  userProfile.updateUserInfo(req, res);
});
/* 03092020 - Gaurav - Option to change user information (firstname, lastname and email) - End */

/* 03102020 - Gaurav - Option to change current password */
router.put("/users/:id/pwdChange", middleware.isLoggedIn, (req, res) => {
  userProfile.changeUserPassword(req, res);
});
/* 03102020 - Gaurav - Option to change current password - End */

// follow user
router.get('/follow/:id', middleware.isLoggedIn, (req, res) => {
  userProfile.followAuthor(req, res);
});

// un-follow user
router.get('/unfollow/:id', middleware.isLoggedIn, (req, res) => {
  userProfile.unfollowAuthor(req, res);
});

// view all notifications
router.get('/notifications', middleware.isLoggedIn, (req, res) => {
  userProfile.showAllNotifications(req, res);
});

// handle notification from menu
router.get('/notifications/:id', middleware.isLoggedIn, (req, res) => {
  userProfile.showNotification(req, res);
});

router.delete("/notifications/:id", middleware.isLoggedIn, (req, res) => {
  userProfile.deleteNotification(req, res);

});

// 03042020 - Gaurav - request admin access route
router.get('/reqAdmin/:id/:option', middleware.isLoggedIn, (req, res) => {
  userProfile.requestAdminAccess(req, res);
});
/*
  USER PROFILE ROUTES - END
*/

router.get("/about", (req, res) => {
  res.render("about", {page: 'about'});
});

module.exports = router;