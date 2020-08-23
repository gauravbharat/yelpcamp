'use strict';

const mongoose = require('mongoose');
const passport = require('passport');
const async = require('async');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

let User = require('../../../models/user');

// all access (login, register, reset passord, etc.) related logic goes here
let accessObj = {};

accessObj.getRegisterForm = (req, res) => {
  delete req.session.redirectTo; //delete redirect to last page
  res.render('register', { page: 'register' });
};

accessObj.registerUser = (req, res) => {
  let registerUser = {
    username: req.sanitize(req.body.username),
    firstName: req.sanitize(req.body.firstName),
    lastName: req.sanitize(req.body.lastName),
    email: req.sanitize(req.body.email),
  };

  if (req.body.avatar) {
    let avatar = req.body.avatar.trim();
    if (avatar !== '') {
      registerUser.avatar = avatar;
    }
  }

  let newUser = new User(registerUser);

  User.register(newUser, req.body.password, function (err, user) {
    if (err || !user) {
      console.log(err);
      req.flash('error', err.message);
      return res.redirect('/register');
    }
    passport.authenticate('local')(req, res, function () {
      req.flash('success', 'Welcome to YelpCamp, ' + user.username + '!');
      res.redirect('/campgrounds');
    });
  });
};

accessObj.showLoginForm = (req, res) => {
  // set the return path for campground show page if user came
  // after click on login (on campground page) to add comments
  if (req.query) {
    let redirectPath = req.query.r;
    if (redirectPath && redirectPath.length > 0) {
      let delPos = redirectPath.lastIndexOf('/');
      if (delPos > 0) {
        let featureName = redirectPath.substr(0, delPos);
        if (featureName === '/campgrounds') {
          let campgroundId = redirectPath.slice(delPos + 1);
          if (mongoose.Types.ObjectId.isValid(campgroundId)) {
            req.session.redirectTo = redirectPath;
          }
        }
      }
    }
  }

  res.render('login', { page: 'login' });
};

accessObj.loginUser = (req, res, next) => {
  passport.authenticate('local', function (err, user, info) {
    if (err) {
      req.flash('error', err.message);
      return next(err);
    }
    if (!user) {
      req.flash('error', info.message);
      return res.redirect('/login');
    }
    req.logIn(user, function (err) {
      if (err) {
        return next(err);
      }
      let redirectTo = req.session.redirectTo
        ? req.session.redirectTo
        : '/campgrounds';
      delete req.session.redirectTo;
      req.flash('success', 'Welcome to YelpCamp, ' + user.username);
      res.redirect(redirectTo);
    });
  })(req, res, next);
};

accessObj.logoutUser = (req, res) => {
  req.logOut();
  req.flash('success', 'Logged you out!');
  res.redirect('/campgrounds');
};

accessObj.showForgotForm = (req, res) => {
  delete req.session.redirectTo; //delete redirect to last page
  res.render('users/forgot');
};

accessObj.postForgotForm = (req, res, next) => {
  async.waterfall(
    [
      function (done) {
        crypto.randomBytes(20, function (err, buf) {
          // create a token that shall be sent to the user
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function (token, done) {
        User.findOne({ email: req.body.email }, function (err, user) {
          if (!user) {
            req.flash('error', 'No account with that email address exists.');
            return res.redirect('/forgot');
          }

          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

          user.save(function (err) {
            done(err, token, user);
          });
        });
      },
      function (token, user, done) {
        let smtpTransport = nodemailer.createTransport({
          service: 'Gmail',
          auth: {
            user: process.env.GMAILID,
            pass: process.env.GMAILPW,
          },
        });
        let mailOptions = {
          to: user.email,
          from: `"YelpCamp ⛺" <${process.env.GMAILID}>`,
          subject: 'YelpCamp (Node.js) Password Reset',
          text:
            'You are receiving this because you (or someone else) have requested the reset of the password.' +
            '\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process - ' +
            '\n' +
            'http://' +
            req.headers.host +
            '/reset/' +
            token +
            '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.',
        };
        smtpTransport.sendMail(mailOptions, function (err) {
          // console.log('mail sent');
          req.flash(
            'success',
            'An e-mail has been sent to ' +
              user.email +
              ' with further instructions.'
          );
          done(err, 'done');
        });
      },
    ],
    function (err) {
      if (err) return next(err);
      res.redirect('/forgot');
    }
  );
};

accessObj.showPasswordResetForm = (req, res) => {
  User.findOne(
    {
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    },
    function (err, user) {
      if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect('/forgot');
      }
      res.render('users/reset', { token: req.params.token });
    }
  );
};

accessObj.resetPassword = (req, res) => {
  async.waterfall(
    [
      function (done) {
        User.findOne(
          {
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() },
          },
          function (err, user) {
            if (!user) {
              req.flash(
                'error',
                'Password reset token is invalid or has expired.'
              );
              return res.redirect('/');
            }
            if (req.body.password === req.body.confirm) {
              user.setPassword(req.body.password, function (err) {
                user.resetPasswordToken = undefined;
                user.resetPasswordExpires = undefined;

                user.save(function (err) {
                  req.logIn(user, function (err) {
                    done(err, user);
                  });
                });
              });
            }
            // if both entered password doesn't match
            else {
              req.flash('error', 'Passwords do not match.');
              return res.redirect('back');
            }
          }
        );
      },
      function (user, done) {
        let smtpTransport = nodemailer.createTransport({
          service: 'Gmail',
          auth: {
            user: process.env.GMAILID,
            pass: process.env.GMAILPW,
          },
        });
        let mailOptions = {
          to: user.email,
          from: `"YelpCamp ⛺" <${process.env.GMAILID}>`,
          subject: 'YelpCamp: Your password has been changed',
          text:
            'Hello ' +
            user.username +
            ',\n\n' +
            'This is a confirmation that the password for your account ' +
            user.email +
            ' has just changed.',
        };
        smtpTransport.sendMail(mailOptions, function (err) {
          req.flash('success', 'Success! Your password has been changed.');
          done(err);
        });
      },
    ],
    function (err) {
      res.redirect('/campgrounds');
    }
  );
};

module.exports = accessObj;

// handle sign-in / login logic - Colt way
// router.post("/login", passport.authenticate("local",
//     {
//         successRedirect: "/campgrounds",
//         failureRedirect: "/login",
//         failureFlash: true,
//         successFlash: 'Welcome to YelpCamp!'
//     }), function(req, res){

// });
