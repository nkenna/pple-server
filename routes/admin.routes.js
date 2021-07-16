module.exports = app => {
    const admins = require("../controllers/admin.controller");
    var router = require("express").Router();
    var tools = require('../config/utils');

    
    router.get("/all-users", tools.authenticateSuperAdminToken, admins.adminAllUsers);  
    router.post("/flag-user", tools.authenticateSuperAdminToken, admins.flagUnflagUser);     
     
    router.get("/all-admins", tools.authenticateSuperAdminToken, admins.allAdmins); 
    router.post("/create-admin", admins.createAdmin); 
    router.post("/admin-start-password-reset", admins.initAdminChangePassword); 
    router.post("/admin-password-reset", admins.resetAdminPassword); 
    router.post("/admin-login", admins.adminLogin); 
    router.post("/admin-change-role", admins.changeAdminRole);

    router.get("/admin-all-events-dashboard", admins.allEventsDashboard); 
    router.get("/admin-all-events", admins.allEvents); 
    router.get("/admin-dashboard-data", admins.dashboardData); 

      
    app.use('/api/v1/admin', router);

    
};