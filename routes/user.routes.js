module.exports = app => {
    const users = require("../controllers/user.controller");
  
    var router = require("express").Router();
    //var tools = require('../config/utils');

    // create new user
 
    router.post("/create-user", users.createUser);
    router.post("/verify-user", users.verifyUser);
    router.post("/change-password", users.changePassword);
    router.post("/login-user", users.loginUser);
    router.post("/send-reset-email", users.sendResetEmail);
    router.post("/reset-password", users.resetPassword);
    router.post("/user-profile-by-email", users.userProfileByEmail);
    router.post("/user-profile-by-id", users.userProfileById);
    router.post("/edit-profile", users.editProfile);
    router.post("/edit-profile-avatar", users.editAvatar);
    router.post("/resend-verify-email", users.resendVerification);
      
    app.use('/api/v1/user', router);
    
};