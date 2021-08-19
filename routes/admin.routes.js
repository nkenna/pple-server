module.exports = app => {
    const admins = require("../controllers/admin.controller");
    const events = require("../controllers/event.controller");
    var router = require("express").Router();
    var tools = require('../config/utils');

    
    router.get("/all-users", tools.authenticateSuperAdminToken, admins.adminAllUsers);  
    router.post("/flag-user", tools.authenticateSuperAdminToken, admins.flagUnflagUser);     
     
    router.get("/all-admins", tools.authenticateSuperAdminToken, admins.allAdmins); 
    router.get("/all-banks", tools.authenticateSuperAdminToken, admins.adminAllBanks);
    router.get("/all-wallets", tools.authenticateSuperAdminToken, admins.adminAllWallets);
    router.get("/all-wallet-trans", tools.authenticateSuperAdminToken, admins.adminAllWalletTrans);
    router.post("/admin-search-wallet-trans", tools.authenticateSuperAdminToken, admins.adminSearchWalletTrans);
    
    
    router.post("/create-admin", admins.createAdmin); 
    router.post("/admin-start-password-reset", admins.initAdminChangePassword); 
    router.post("/admin-password-reset", admins.resetAdminPassword); 
    router.post("/admin-login", admins.adminLogin); 
    router.post("/admin-change-role", admins.changeAdminRole);

    router.get("/admin-all-events-dashboard", admins.allEventsDashboard); 
    router.get("/admin-all-ticket-dashboard", admins.allTicketSoldDashboard); 
    router.get("/admin-all-events", admins.allEvents); 
    router.get("/admin-dashboard-data", admins.dashboardData); 
    router.post("/admin-search-users", admins.adminSearchUsers); 
    router.get("/admin-all-ticket-sales", admins.adminAllTicketSales); 

    router.post("/admin-create-event", events.createAdminEvent); 
    router.post("/admin-quick-create-event", events.quickCreateEvent); 

      
    app.use('/api/v1/admin', router);

    
};
