const mongoose    = require("mongoose");
var Campground    = require("./models/campground");
var Comment       = require("./models/comment")
const fileName = "seeds.js";

var seeds = [
    {
        name: "Cloud's Rest", 
        image: "https://farm4.staticflickr.com/3795/10131087094_c1c0a1c859.jpg",
        description: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum"
    },
    {
        name: "Desert Mesa", 
        image: "https://farm6.staticflickr.com/5487/11519019346_f66401b6c1.jpg",
        description: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum"
    },
    {
        name: "Canyon Floor", 
        image: "https://farm1.staticflickr.com/189/493046463_841a18169e.jpg",
        description: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum"
    }, 
    {
        name: "Glacier Camping",
        image: "https://images.unsplash.com/photo-1471115853179-bb1d604434e0?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=500&q=60",
        description: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum"
    },
    {
        name: "Lakeside Camp",
        image: "https://images.unsplash.com/photo-1508873696983-2dfd5898f08b?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=500&q=60",
        description: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum"
    },
    {
        name: "Floral Mountain Camp",
        image: "https://images.unsplash.com/photo-1532339142463-fd0a8979791a?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=500&q=60",
        description: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum"
    },
    {
        name: "Under Stars Camp",
        image: "https://images.unsplash.com/photo-1537565266759-34bbc16be345?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=500&q=60",
        description: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum"
    }
];

// ASYNC - AWAIT CODING STYLE
async function seedDB(){
    try {
        // Remove all campgrounds data
        await Campground.deleteMany({});
        console.log(fileName + ": removed campgrounds!")
                
        // Remove all comments data
        await Comment.deleteMany({});
        console.log(fileName + ": removed comments!")
        
        for(const seed of seeds){
            let addedCampground = await Campground.create(seed);
            console.log(fileName + ": created new campground " + addedCampground.name);
            let addedComment = await Comment.create({
                text: "This place is great, but I wish there was internet.",
                author: "Homer"
                }
            );    
            console.log(fileName + ": created new comment");
            addedCampground.comments.push(addedComment);
            addedCampground.save();
            console.log(fileName + ": added comment for " + addedCampground.name);
        };
    } catch(err) {
        console.log(fileName + ": " + err);
    }    
};

// CALLBACK CODING STYLE
// function seedDB(){
//     // Remove all campgrounds data
//     Campground.deleteMany({}, function(err){
//         if(err){
//             console.log("seeds.js:" + err);
//         } else {
//             console.log("seeds.js: removed campgrounds!")
            
//             // Remove all comments data
//             Comment.deleteMany({}, function(err){
//                 if(err){
//                     console.log("seeds.js:" + err);
//                 } else {
//                     console.log("seeds.js: removed comments!")

//                     // add campgrounds
//                     seeds.forEach(function(seed){
//                         Campground.create(seed, function(err, addedCampground){
//                             if(err){
//                                 console.log("seeds.js:" + err);
//                             } else {
//                                 console.log("seeds.js: added a campground " + addedCampground.name);

//                                 // create a comment
//                                 Comment.create({
//                                     text: "This place is great, but I wish there was internet.",
//                                     author: "Homer"
//                                 }, function(err, comment){
//                                     if(err){
//                                         console.log("seeds.js:" + err);
//                                     } else {
//                                         addedCampground.comments.push(comment);
//                                         addedCampground.save();
//                                         console.log("seeds.js: created new comment for " + addedCampground.name);
//                                     }
//                                 });
//                             }
//                         });
//                     });
//                 }
//             })
//         }
//     });
// };

module.exports = seedDB;