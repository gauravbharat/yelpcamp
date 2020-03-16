const mongoose = require("mongoose");

var notificationSchema = new mongoose.Schema({
  username: {type: String, required: true},
  campgroundId: {type: String},
  isRead: {type: Boolean, default: false},
  created: {type: Date, default: Date.now},
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  commentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  },
  campgroundName: {type: String},
  notificationType: { type: Number, required: true }
});

/* 
  Notification Types:
  Action                      Value
  New Campground              0
  New Comment                 1
  User Admin Request          2
 */

module.exports = mongoose.model("Notification", notificationSchema);