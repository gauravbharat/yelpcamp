var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var userSchema = new mongoose.Schema({
    username: {type: String, unique: true, required: true},
    password: String,
    avatar: {type: String, default: 'https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcQJS3-GoTF9xqAIyRROWdTD8SUihnSdP5Ac2uPb6AzgGHHyeuuD'},
    firstName: String,
    lastName: String,
    email: {type: String, unique: true, required: true},
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    isAdmin: {type: Boolean, default: false},
    notifications: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Notification'
        }
    ],
    followers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    created: {type: Date, default: Date.now},
    isPublisher: {type: Boolean, default: false}
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);