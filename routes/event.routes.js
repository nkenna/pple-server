module.exports = app => {
    const events = require("../controllers/event.controller");
    const likes = require("../controllers/like.controller");
  
    var router = require("express").Router();
    var tools = require('../config/utils');

    // create new user 
    router.post("/create-event", tools.authenticateToken, events.createEvent);
    router.post("/edit-event", tools.authenticateToken, events.editEvent);
    router.post("/edit-event-location", tools.authenticateToken, events.editEventLocation);
    router.post("/create-ticket", tools.authenticateToken, events.createEventTicket);
    router.post("/events-by-host", events.eventsByUser);
    router.post("/event-by-ref", events.eventsByRef);
    router.post("/event-by-id", events.eventsById);
    router.post("/search-for-event", events.searchForEvent);


    router.post("/buy-paid-ticket", tools.authenticateToken, events.buyTicket);
    router.post("/buy-free-ticket", tools.authenticateToken, events.buyTicketFree);
    router.post("/upload-event-image", tools.authenticateToken, events.editEventMedia);
    router.post("/cancel-event", tools.authenticateToken, events.cancelEvent);

    router.post("/like-event", tools.authenticateToken, likes.LikeEvent);
    router.post("/unlike-event", tools.authenticateToken, likes.UnLikeEvent);
    router.post("/user-liked-events", likes.userLikedEvents);
    
    router.post("/event-guests", tools.authenticateToken, events.eventGuests);
    router.post("/joined-events", tools.authenticateToken, events.userJoinedEvents);

    router.get("/all-events", events.allEvents);
    router.get("/upcoming-events", events.upComingEvents);
    router.get("/ongoing-events", events.onGoingEvents);
    router.get("/past-events", events.pastEvents);
    router.get("/cancelled-events", events.cancelledEvents);
      
      
    app.use('/api/v1/event', router);
    
};