module.exports = app => {
    const users = require("../controllers/user.controller");
    const follows = require("../controllers/follow.controller");
  
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
    router.post("/add-update-device", tools.authenticateToken, users.addUpdateDevice);
    router.get("/all-host-users", users.allHostUsers);

    router.post("/card/add-card", tools.authenticateToken, users.addCustomerCard);
    router.post("/card/delete-card", tools.authenticateToken, users.deleteCustomerCard);
    router.post("/card/change-default-card", tools.authenticateToken, users.updateStripeCustomerCard);
    router.post("/card/all-user-cards", tools.authenticateToken, users.allUserCards);

    router.post("/follow/follow-user", tools.authenticateToken, follows.followUser);
    router.post("/follow/accept-reject-follow", tools.authenticateToken, follows.acceptOrRejectFollow);
    router.post("/follow/unfollow-user", tools.authenticateToken, follows.unfollowUser);
      
    app.use('/api/v1/user', router);
    
};