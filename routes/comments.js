// ========================
// COMMENT ROUTES
// ========================
"use strict";
const express = require("express");
const router = express.Router({mergeParams: true});

const middleware = require("../middleware"); // defaults to index.js
const commentScripts = require("../scripts/backend/comments/comments");

// Comments New
router.get("/new", middleware.isLoggedIn, (req, res) => {
  commentScripts.showNewComment(req, res);
});

// Comments Create
router.post("/", middleware.isLoggedIn, (req, res) => {
  commentScripts.createNewComment(req, res);
});

// // EDIT COMMENT ROUTE
// router.get("/:comment_id/edit", middleware.checkCommentOwnership, (req, res) => {
//   commentScripts.editComment(req, res);
// });

// UPDATE COMMENT ROUTE
router.put("/:comment_id", middleware.checkCommentOwnership, (req, res) => {
  commentScripts.updateComment(req, res);
});

// DESTROY COMMENT ROUTE
router.delete("/:comment_id", middleware.checkCommentOwnership, (req, res) => {
  commentScripts.deleteComment(req, res);
});

module.exports = router;