const db = require('../models')
const User = db.users
const Wallet = db.wallets
const Card = db.cards
const VerifyCode = db.verifycodes
const ResetCode = db.resetcodes
const Device = db.devices
const Order = db.orders
const Event = db.events;
const Guest = db.guests;
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
        .then(user => {
            if(!user){
                result.status = "failed";
                result.message = "user does not exist";
                return res.status(404).send(result); 
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
                EventRoom.updateOne({_id: eventRoom._id}, eventRoom)
                .then(data => console.log("event room updated"))
                .catch(err => console.log("error updating event room"));

                result.status = "success";
                result.message = "chat message sent";
                result.chat = newchat;
                return res.status(200).send(result);
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