yelpcamp
A code-as-you-learn app developed from Colt's Web Developer Bootcamp, refactored for some part.

Refactored part:
1. Glow button on landing page
2. New bootstrap 4 feature, with regards to labels collapsing inside the input elements.
3. Welcome page 
  3.1 campground cards to be of equal sizes.
  3.2 Border shadow on Jumbotron
  3.3 Display cards (Admin only) for Total campgrounds, users, contributors and admins
4. Campground page
  4.1 Edit comment in the same field as displayed.
  4.2 Show comment author image
  4.3 Show 'edited' for updated comments
  4.4 Show comment author info and campgrounds in a modal/pop-up window when the comment author name is clicked
  4.5 Revert to old comment, when the cancel button is clicked, while updating the comment
5. User Page
  5.1 Added separate tabs to display user campgrounds and information.
  5.2 Option to update user fields
  5.3 Option to change current password
  5.4 Option for user to request admin access and send email notifications to the admin users
  5.5 Option for admin to grant admin access to other campground user
  5.6 Option to change current profile pic on hover
6. Notifications
  6.1 Admins get notification when any user requests for admin access
  6.2 Get notifications when any user comments on your campground
  6.3 Option to delete individual notifications from the "View past notifications" page
  6.4 When any campground comments notification is clicked, it opens the associated campground and scrolls to the that comment.
7. Code changes
  7.1 Cascade delete any user notifications when a user is deleted/removed
  7.2 Remove associations/references from any follower records, for a user when removed/deleted
  7.3 Usage of ES6 methods on more places, utility code reuse and encapsulation.


Project Directory:
I've added some folders to hold the scripts (js). It may not follow the regular project structure conventions. Pardon me, since this my first ever web app and I was new to this web development arena. I've been into desktop development since the start my career, in 2013, and we followed a different folder structure then.