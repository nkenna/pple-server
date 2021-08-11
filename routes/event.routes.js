module.exports = app => {
    const events = require("../controllers/event.controller");
  
    var router = require("express").Router();
    //var tools = require('../config/utils');

    // create new user 
    router.post("/create-event", events.createEvent);
    router.post("/create-ticket", events.createEventTicket);
    router.post("/events-by-host", events.eventsByUser);
    router.post("/buy-paid-ticket", events.buyTicket);
    router.post("/upload-event-image", events.editEventMedia);
      
      
    app.use('/api/v1/event', router);
    
};