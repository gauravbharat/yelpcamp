const mongoose = require("mongoose");

var notificationSchema = new mongoose.Schema({
    username: {type: String, required: true},
    campgroundId: {type: String, required: true},
    isRead: {type: Boolean, default: false},
    created: {type: Date, default: Date.now}
});

module.exports = mongoose.model("Notification", notificationSchema);