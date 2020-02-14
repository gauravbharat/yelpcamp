const mongoose = require("mongoose");

// SCHEMA SETUP
var campgroundSchema = new mongoose.Schema({
    name: {type: String, required: true},
    price: {type: String, default: '0.00'},
    image: {type: String, required: true},
    location: String,
    latitude: Number,
    longitude: Number,
    description: String,
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String 
    },
    created: {type: Date, default: Date.now},
    comments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment"
        }
    ]
});

module.exports = mongoose.model("Campground", campgroundSchema);