const mongoose = require("mongoose");

var notificationSchema = new mongoose.Schema({
    username: {type: String, required: true},
    campgroundId: {type: String},
    isRead: {type: Boolean, default: false},
    created: {type: Date, default: Date.now},
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
});

module.exports = mongoose.model("Notification", notificationSchema);