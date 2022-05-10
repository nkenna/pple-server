module.exports = app => {
    const chat = require("../controllers/chat.controller");
  
    var router = require("express").Router();
    var tools = require('../config/utils');

    // create new  chat message
    router.post("/send-chat-message", tools.authenticateToken, chat.createChat);
    router.post("/delete-chat-message", tools.authenticateToken, chat.deleteChat);
    router.get("/get-user-chat-rooms", tools.authenticateToken, chat.getUserChatRooms);
    router.get("/get-chats-by-room", tools.authenticateToken, chat.getChatsByChatRoom);
    
      
    app.use('/api/v1/chat', router);
    
};