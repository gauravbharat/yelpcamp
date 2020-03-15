// ========================
// CAMPGROUND ROUTES
// ========================
"use strict";

const express = require("express");
const router = express.Router();

let middleware = require("../middleware"); // defaults to middleware/index.js
let campgroundScripts = require("../scripts/backend/campgrounds/campgrounds");

// Cloudinary image upload - start
const multer = require("multer");
let storage = multer.diskStorage({
  fileName: function(req, res, callback) {
      callback(null, Date.now() + file.originalname);
  }
});
let imageFilter = function(req, file, callback) {
    //accept image file only
  if(!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
    return callback(new Error('Only image files are allowed!'), false);
  }
  callback(null, true);
};
let upload = multer({storage: storage, fileFilter: imageFilter});
// Cloudinary image upload - end

// INDEX - show all campgrounds
router.get("/", (req, res) => {
  campgroundScripts.showAllCampgrounds(req, res);
});

// CREATE - create new campground
// Cloudinary - added image upload code between middleware and (req, res)
router.post("/", middleware.isLoggedIn, upload.single('image'), (req, res) => {
  campgroundScripts.createCampground(req, res);
});

// NEW - take user input for new campground
router.get("/new", middleware.isLoggedIn, (req, res) => {
  res.render("campgrounds/new");
});

// SHOW - show more info about one campground
router.get("/:id", (req, res) => {
  campgroundScripts.showCampground(req, res);
});

// EDIT CAMPGROUND ROUTE
router.get("/:id/edit", middleware.checkCampgroundOwnership, (req, res) => {
  campgroundScripts.editCampground(req, res);
});

/* MOVED AFTER GET ROUTE "/:id/edit" */
// Pass comment Id to set focus on the newly added comment
router.get("/:id/:comment_id", (req, res) => {
  campgroundScripts.showCampground(req, res);
});

// UPDATE CAMPGROUND ROUTE
router.put("/:id", middleware.checkCampgroundOwnership, upload.single('image'), (req, res) => {
  campgroundScripts.updateCampground(req, res);
});

// DESTROY CAMPGROUND ROUTE
router.delete("/:id", middleware.checkCampgroundOwnership, (req, res) => {
  campgroundScripts.deleteCampground(req, res);
});

module.exports = router;