module.exports = app => {
    const invites = require("../controllers/invite.controller");
  
    var router = require("express").Router();
    var tools = require('../config/utils');

    // create new user
 
    router.post("/send-invite", tools.authenticateToken, invites.createInvite);
    router.post("/accept-reject-invite", tools.authenticateToken, invites.acceptOrRejectInviteRequest);
    router.post("/user-accept-reject-invite", tools.authenticateToken, invites.userAcceptOrRejectInviteRequest);
    router.get("/recent-invites", invites.recentInvites);
    router.get("/suggested-invites", invites.suggestedUsersToInvite);
    router.post("/request-to-join", tools.authenticateToken, invites.requestToJoinEvent);
    router.get("/search-invites", tools.authenticateToken, invites.searchInvites);
    router.post("/send-many-invites", tools.authenticateToken, invites.inviteToEvents);
    router.get("/requested-invites", tools.authenticateToken, invites.requestedInvites);
    app.use('/api/v1/invite', router);
    
};