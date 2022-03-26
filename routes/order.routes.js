module.exports = app => {
    const orders = require("../controllers/order.controller");
  
    var router = require("express").Router();
    var tools = require('../config/utils');
 
    router.post("/create-order", tools.authenticateToken, orders.createOrder);
    router.post("/complete-order", tools.authenticateToken, orders.payForOrder);
    router.post("/apply-tip-to-order", tools.authenticateToken, orders.applyTip);
    router.get("/all-orders", orders.allOrders);
    app.use('/api/v1/order', router);
    
};