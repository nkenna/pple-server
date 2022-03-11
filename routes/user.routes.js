module.exports = app => {
    const users = require("../controllers/user.controller");
  
    var router = require("express").Router();
    var tools = require('../config/utils');

    // create new user
 
    router.post("/create-user", users.createUser);
    router.post("/verify-user", users.verifyUser);
    router.post("/change-password", users.changePassword);
    router.post("/login-user", users.loginUser);
    router.post("/send-reset-email", users.sendResetEmail);
    router.post("/reset-password", users.resetPassword);
    router.post("/user-profile-by-email", tools.authenticateToken, users.userProfileByEmail);
    router.post("/user-profile-by-id", tools.authenticateToken, users.userProfileById);
    router.post("/edit-profile", tools.authenticateToken, users.editProfile);
    router.post("/edit-profile-avatar", tools.authenticateToken, users.editAvatar);
    router.post("/resend-verify-email", users.resendVerification);
    router.post("/create-username", tools.authenticateToken, users.addUsernameToUser);
      
    app.use('/api/v1/user', router);
    
};