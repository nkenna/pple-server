module.exports = app => {
    const invites = require("../controllers/invite.controller");
  
    var router = require("express").Router();
    var tools = require('../config/utils');

    // create new user
 
    router.post("/send-invite", tools.authenticateToken, invites.createInvite);
    app.use('/api/v1/invite', router);
    
};