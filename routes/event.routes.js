module.exports = app => {
    const events = require("../controllers/event.controller");
    const likes = require("../controllers/like.controller");
  
    var router = require("express").Router();
    //var tools = require('../config/utils');

    // create new user 
    router.post("/create-event", events.createEvent);
    router.post("/edit-event", events.editEvent);
    router.post("/create-ticket", events.createEventTicket);
    router.post("/events-by-host", events.eventsByUser);
    router.post("/event-by-ref", events.eventsByRef);
    router.post("/event-by-id", events.eventsById);
    router.post("/search-for-event", events.searchForEvent);


    router.post("/buy-paid-ticket", events.buyTicket);
    router.post("/buy-free-ticket", events.buyTicketFree);
    router.post("/upload-event-image", events.editEventMedia);

    router.post("/like-event", likes.LikeEvent);
    router.post("/unlike-event", likes.UnLikeEvent);
    router.post("/user-liked-events", likes.userLikedEvents);

    router.get("/all-events", events.allEvents);
    router.get("/upcoming-events", events.upComingEvents);
    router.get("/ongoing-events", events.onGoingEvents);
    router.get("/past-events", events.pastEvents);
      
      
    app.use('/api/v1/event', router);
    
};