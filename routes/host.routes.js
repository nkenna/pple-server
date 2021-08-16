module.exports = app => {
    const host = require("../controllers/host.controller");
  
    var router = require("express").Router();
    //var tools = require('../config/utils');

    // create new user 
    router.post("/create-stripe-customer", host.addHostAsCustomer);
    router.post("/add-bank-to-stripe", host.addHostBankInfoViaBankId);
    router.post("/create-stripe-account", host.createHostStripeAccount);
    router.post("/add-wallet-to-host", host.addWalletToHost);
    router.post("/tip-host", host.tipHost);
    router.post("/pay-tip-host", host.payoutHostTip);
    
      
    app.use('/api/v1/host', router);
    
};