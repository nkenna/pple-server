const db = require('../models')
const User = db.users
const Event = db.events;
const Invite = db.invites;
const Wallet = db.wallets
const Card = db.cards
const VerifyCode = db.verifycodes
const ResetCode = db.resetcodes
const Device = db.devices

const EventRoom = db.eventrooms;
const Chat = db.chats;


exports.createChat = (req, res) => {
    var result = {};

    var eventRoomId = req.body.eventRoomId;
    var senderId = req.body.senderId;
    var message = req.body.message;

    EventRoom.findOne({_id: eventRoomId})
    .then(eventRoom => {
        if(!eventRoom){
            result.status = "failed";
            result.message = "chat room does not exist";
            return res.status(404).send(result); 
        }

        User.findOne({_id: senderId})
        .then(async(user) => {
            if(!user){
                result.status = "failed";
                result.message = "user does not exist";
                return res.status(404).send(result); 
            }

            let chatEvent = await Event.findOne({_id: eventRoom.eventId}).exec();

            let foundInvite = await Invite.findOne({inviteeId: senderId, accepted: true, eventId: eventRoom.eventId}).exec();
            
            if(chatEvent == null){
                result.status = "failed";
                result.message = "sending message failed. pple not found";
                return res.status(400).send(result); 
            }

            if(foundInvite == null){
                result.status = "failed";
                result.message = "sending message failed. invite not found";
                return res.status(400).send(result); 
            }

            if(chatEvent.hostById != senderId && foundInvite == null  ){
                result.status = "failed";
                result.message = "sending message failed. get an invite to continue";
                return res.status(400).send(result); 
            }



            // create chat data
            var chat = new Chat({
                eventId: eventRoom.eventId,
                senderId: user._id,
                message: message,
                eventRoomId: eventRoom._id,
                eventroom: eventRoom._id,
                user: user._id,
                event: eventRoom.eventId,
            });


            chat.save(chat)
            .then(newchat => {
                // update event room last chat
                eventRoom.lastChat = newchat._id;
                eventRoom.chats.push(newchat._id);
                EventRoom.updateOne({_id: eventRoom._id}, eventRoom)
                .then(data => console.log("event room updated"))
                .catch(err => console.log("error updating event room"));

                Chat.findOne({_id: newchat._id})
                .populate('eventroom', {chats: 0, users: 0})
                .populate('user', {firstname: 1, lastname: 1, email: 1, avatar: 1, username: 1})
                .then(cc => {
                    result.status = "success";
                    result.message = "chat message sent";
                    result.chat = cc;
                    return res.status(200).send(result);
                })

                
            })
            .catch(err => {
                console.log(err);
                result.status = "failed";
                result.message = "error sending chat message";
                return res.status(500).send(result);
            }); 
        })
        .catch(err => {
            console.log(err);
            result.status = "failed";
            result.message = "error finding sender data";
            return res.status(500).send(result);
        }); 
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error finding chat room";
        return res.status(500).send(result);
    }); 
}

exports.deleteChat = (req, res) => {
    var result = {};

    var chatId = req.body.chatId;
    var senderId = req.body.senderId;

    Chat.findOne({_id: chatId})
    .then(chat => {
        if(!chat){
            result.status = "failed";
            result.message = "chat does not exist";
            return res.status(404).send(result); 
        }

        if(senderId != chat.senderId){
            result.status = "failed";
            result.message = "you are not allowed to perform this operation";
            return res.status(403).send(result); 
        }

        Chat.deleteOne({_id: chat._id})
        .then(deleted => {
            result.status = "success";
            result.message = "chat deleted";
            return res.status(200).send(result);
        })
        .catch(err => {
            console.log(err);
            result.status = "failed";
            result.message = "error deleting chat message";
            return res.status(500).send(result);
        });
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error finding chat message";
        return res.status(500).send(result);
    });
}

exports.getUserChatRooms = (req, res) => {
    var result = {};

    var userId = req.query.userId;

    EventRoom.find({ "users": { "$all": userId} })
    .populate('chats')
    .populate('users', {firstname: 1, lastname: 1, email: 1, avatar: 1, username: 1})
    .populate({ 
        path: 'event',
        populate: {
          path: 'location',
          model: 'location',
        },
        
     })
    .then(rooms => {
        result.status = "success";
        result.rooms = rooms;
        result.message = "chat rooms found";
        return res.status(200).send(result); 
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error finding chat rooms";
        return res.status(500).send(result);
    });
}


exports.getChatRoomById = (req, res) => {
    var result = {};

    var roomId = req.query.roomId;

    EventRoom.findOne({_id: roomId})
    .populate('chats')
    .populate('users', {firstname: 1, lastname: 1, email: 1, avatar: 1, username: 1})
    .populate({ 
        path: 'event',
        populate: {
          path: 'location',
          model: 'location',
        },
        
     })
    .then(room => {
        result.status = "success";
        result.room = room;
        result.message = "chat room found";
        return res.status(200).send(result); 
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error finding chat room";
        return res.status(500).send(result);
    });
}

exports.getChatsByChatRoom = (req, res) => {
    var result = {};
    var roomId = req.query.roomId;
    var page = req.query.page;
    var perPage = 20;

    if(!page){
        page = 1;
    }

    Chat.countDocuments({eventRoomId: roomId})
    .then(count => {
        Chat.find({eventRoomId: roomId})
        .populate('eventroom', {chats: 0, users: 0})
        .populate('user', {firstname: 1, lastname: 1, email: 1, avatar: 1, username: 1})
        //.populate('event')
        .then(chats => {
            result.status = "success";
            result.chats = chats;
            result.total = count;
            result.currentPage = page;
            result.perPage = perPage;
            result.message = "chats found: " + chats.length;
            return res.status(200).send(result);
        })
        .catch(err => {
            console.log(err);
            result.status = "failed";
            result.message = "error finding chats";
            return res.status(500).send(result);
        });
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error counting user chats";
        return res.status(500).send(result);
    });

    
}