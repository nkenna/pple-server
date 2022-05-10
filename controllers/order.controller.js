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
const Invite = db.invites;
const cryptoRandomString = require('crypto-random-string')
const moment = require('moment')
var tools = require('../config/utils');
const bcrypt = require('bcrypt');
const saltRounds = 10;
//require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_TEST_API_KEY);

exports.createOrder = (req, res) => {
    var result = {};

    var quantity = req.body.quantity;
    var eventId = req.body.eventId;
    var userId = req.body.userId;

    

    User.findOne({_id: userId})
    .then(user => {
        if(!user){
            result.status = "failed";
            result.message = "user account does not exist";
            return res.status(404).send(result); 
        }

        Event.findOne({_id: eventId})
        .then(event => {
            if(!event){
                result.status = "failed";
                result.message = "event does not exist";
                return res.status(404).send(result); 
            }

            if(event.guestLimit > 0){
                if(quantity != event.guestLimit){
                    result.status = "failed";
                    result.message = "quantiy and guest limit not equal";
                    return res.status(409).send(result); 
                }
            }

            

            // calculate charges
            var amt = event.price * quantity;

            var numCharges = tools.roundUpNumber(tools.calculateHostTipCommission(amt, 5.8) + 0.30);
            var charges = numCharges;

            // calculate vat subcharge
            var numVatSubTotal = tools.roundUpNumber(tools.calculateHostTipCommission(amt, 10)); // lets keep VAT at 10%
            var vatSubTotal = numVatSubTotal;

            var total = vatSubTotal + charges + amt;
            var num = tools.roundUpNumber(total - (vatSubTotal + charges));
            var subtotal = num;

            // create order
            var order = new Order({
                eventId: event._id,
                orderRef: cryptoRandomString({ length: 15, type: 'alphanumeric' }), 
                transDate: moment().toISOString(),
                stripeCustomerId: user.stripeCustomerId,
                status: 'pending', // success, pending, cancelled
                quantity: quantity,
                vatAmount: vatSubTotal,
                total: total,
                charges: charges,
                vat: 10.0,
                pricePerQty: event.price,
                //hostTip: { type: Number, default: 0 },
                subTotal: subtotal,
                userId: user._id,
                user: user._id,
                event: event._id
                //paymentCard: { type: mongoose.Schema.Types.ObjectId, ref: 'card' }
            });

            order.save(order)
            .then(newOrder => {
                //send push notification for created order
                Device.findOne({userId: user._id})
                    .then(device => {
                        if(device){
                            var data = {
                                "orderId": followed._id.toString(),
                                "userId": newGuest.id.toString(),
                            };
                            tools.pushMessageToDeviceWithData(
                                device.token,
                                "New Order created",
                                "You have created a new order. Tap to complete order",
                                data
                            );
                        }
                })
                .catch(err => console.log("error finding user device"));
                result.status = "success";
                result.message = "order created succesfully";
                result.order = newOrder;
                return res.status(200).send(result); 
            })
            .catch(err => {
                console.log(err);
                result.status = "failed";
                result.message = "error occurred creating order";
                return res.status(500).send(result);
            }); 
        })
        .catch(err => {
            console.log(err);
            result.status = "failed";
            result.message = "error occurred finding event";
            return res.status(500).send(result);
        }); 
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding user";
        return res.status(500).send(result);
    }); 

}


exports.applyTip = (req, res) => {
    var result = {};

    var tipAmount = req.body.tipAmount;
    var orderId = req.body.orderId;

    Order.findOne({_id: orderId})
    .then(order => {
        if(!order){
            result.status = "failed";
            result.message = "order does not exist";
            return res.status(404).send(result); 
        }
        var oldHostTip = order.hostTip;
        order.hostTip = tipAmount;
        console.log(tipAmount);
        if(tipAmount == 0){
            order.total = order.total - oldHostTip;
            console.log(order.total);
            order.appliedTip = false;
        }else if(tipAmount > 0){
            order.total = order.total + tipAmount;
            order.appliedTip = true;
            console.log(order.total);
        }
        var num = tools.roundUpNumber(order.total - (order.vatSubTotal + order.charges));
        order.subtotal = num;

        Order.updateOne({_id: order._id}, order)
        .then(update => {
            result.status = "success";
            result.message = "tip applied successfully";
            return res.status(200).send(result); 
        })
        .catch(err => {
            console.log(err);
            result.status = "failed";
            result.message = "error occurred updating order";
            return res.status(500).send(result);
        });

    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding order";
        return res.status(500).send(result);
    });
}

exports.payForOrder = (req, res) => {
    var result = {};

    var orderId = req.body.orderId;
    var eventId = req.body.eventId;
    var userId = req.body.userId;

    User.findOne({_id: userId})
    .then(user => {
        if(!user){
            result.status = "failed";
            result.message = "user account does not exist";
            return res.status(404).send(result); 
        }

        Event.findOne({_id: eventId})
        .then(event => {
            if(!event){
                result.status = "failed";
                result.message = "event does not exist";
                return res.status(404).send(result); 
            }

            Order.findOne({_id: orderId})
            .then(order => {
                if(!order){
                    result.status = "failed";
                    result.message = "order does not exist";
                    return res.status(404).send(result); 
                }

                /*if(guests.length > order.quantity){
                    result.status = "failed";
                    result.message = "number of guests is greater than quantity of orders made, guest list must be less than or match oder quantity";
                    return res.status(409).send(result); 
                }*/

                // gretrieve customer from stripe
                stripe.customers.retrieve(
                    user.stripeCustomerId
                )
                .then(customerData => {
                   // console.log(customerData.default_source);
                    // create charge object with customer default card
                    stripe.charges.create({
                        amount: order.total * 100,
                        currency: 'usd',
                        source: customerData.default_source,
                        description: 'My First Test Charge (created for API docs)',
                        customer: customerData.id
                    })
                    .then(chargeData => {

                        // update event room last chat
                        event.hostById = user._id;
                        event.hostBy = user._id;
                        event.hosted = true;
                        Event.updateOne({_id: event._id}, event)
                        .then(data => console.log("event updated"))
                        .catch(err => console.log("error event"));

                        // retrieve user payment card
                        Card.findOne({cardId: chargeData.payment_method})
                        .then(card => {
                            // update this order                            
                            order.chargeId = chargeData.id;
                            order.stripeAmount = chargeData.amount / 100;
                            order.stripePaymentMethod = chargeData.payment_method;
                            order.stripeStatus = chargeData.status;
                            order.stripePaid = chargeData.paid
                            order.status = chargeData.paid == true && chargeData.status == 'succeeded' ? 'success' : 'failed'; // success, pending, cancelled, failed
                            order.paymentCard = card._id;
                            order.paymentCardId = card._id;

                            Order.updateOne({_id: order._id}, order)
                            .then(data => {
                               
                                
                                EventRoom.findOne({_id: event.eventRoomId})
                                .then(room => {
                                    if(room){
                                        // add this user to room
                                        room.users.push(user._id);
                                        EventRoom.updateOne({_id: room._id}, room)
                                        .then(r => console.log("event chat room updated"))
                                        .catch(err => console.log("error adding updating event chat room"));

                                        // send joined chat message
                                        var chat = new Chat({
                                            eventId: room.eventId,
                                            senderId: user._id,
                                            message: "@" + user.username + " just joined",
                                            isJoinChat: true,
                                            eventRoomId: room._id,
                                            eventroom: room._id,
                                            user: user._id,
                                            event: room.eventId,
                                        });

                                        chat.save(chat)
                                        .then(ch => {
                                            console.log("chat message sent");

                                            // update event room last chat
                                            room.lastChat = ch._id;
                                            EventRoom.updateOne({_id: room._id}, room)
                                            .then(data => console.log("event room updated"))
                                            .catch(err => console.log("error updating event room"));

                                            // send push notification to chat room event
                                            Device.findOne({userId: user._id})
                                            .then(device => {
                                                if(device){
                                                    var data = {
                                                        "userId": user._id.toString(),
                                                        "chatRoomId": room._id.toString(),
                                                        "eventId": event._id.toString()
                                                    };
                            
                                                    tools.pushMessageToDeviceWithData(
                                                        device.token,
                                                        "Joined Chat",
                                                        "someone just joined your experience chat room",
                                                        data
                                                    );

                                                    Device.findOne({userId: invite.inviteeId})
                                                    .then(device => {
                                                        if(device){
                                                            tools.subscribeToChatRoom(event.eventRoomId, device.token)
                                                        }
                                                    })
                                                    .catch(err => console.log("error finding invitee device"));
                                                }
                                            })
                                            .catch(err => console.log("error finding user device"));
                                        })
                                        .catch(err => console.log("error sending chat message"));
                                    }
                                })
                                .catch(err => console.log("error adding user to event chat room"));

                                // change this user to be a host
                                user.isHost = true;
                                user.hostedEventCount = user.hostedEventCount + 1;
                            
                                // update user
                                User.updateOne({_id: user._id}, user)
                                .then(da => console.log("user have been upgraded to host"))
                                .catch(err => console.log("error occurred upgrading user to host"));

                                // create invite data for this
                                var invite = new Invite({
                                    inviteMsg: user.username + " joined this experience",
                                    inviterId: user._id,
                                    inviteeId: user._id,
                                    eventId: event._id,
                                    event: event._id,
                                    inviter: user._id,
                                    invitee: user._id,
                                    accepted: true
                                    
                                });
            
                                invite.save(invite)
                                .then(inv => console.log("invite data"))
                                .catch(err => console.log("error occurred creating invite data"));

                                var cardData = card.brand + ' ending in *' + card.last4;
                                var now = moment();

                                // send EMail
                                var emailData = 
                                {
                                    title: event.title,
                                    titleValue: "$" + order.subTotal,
                                    chargeValue: "$" + order.charges,
                                    taxValue: "$" + order.vatAmount,
                                    tipValue: "$" + order.hostTip,
                                    totalValue: "$" + order.total,//chargeData.amount / 100,
                                    card: cardData,
                                    day:  now.format('dddd'),//chargeData "Monday",
                                    month: now.format('MMMM'),
                                    date: now.format('DD'),
                                    year: now.format('YYYY'),
                                    hour: now.format('hh'),
                                    minute: now.format('mm'),
                                    period: now.format('a'),
                                    orderRef: order.orderRef
                                }

                                console.log(user.email);
                                console.log(emailData);

                                tools.sendEmail(
                                    user.email,
                                    "your PPLE order completed",
                                    "Your order have been completed. Here is your receipt:",
                                    emailData,
                                    "d-c33389848bd04960acf38e77ff22b83e"
            
                                );


                                result.status = "success";
                                result.message = "order paid successfully";
                                return res.status(200).send(result); 
                            })
                            .catch(err => {
                                console.log(err);
                                result.status = "failed";
                                result.message = "error occurred completing order";
                                return res.status(500).send(result);
                            });
                        })
                        .catch(err => {
                            console.log(err);
                            result.status = "failed";
                            result.message = "error occurred finding user card";
                            return res.status(500).send(result);
                        });

                        
                    })
                    .catch(err => {
                        console.log(err);
                        result.status = "failed";
                        result.message = "error occurred calling stripe: " + err.message;
                        return res.status(500).send(result);
                    });
                })
                .catch(err => {
                    console.log(err);
                    result.status = "failed";
                    result.message = "error occurred calling stripe: " + err.message;
                    return res.status(500).send(result);
                });
               
                
            })
            .catch(err => {
                console.log(err);
                result.status = "failed";
                result.message = "error occurred finding order";
                return res.status(500).send(result);
            });


        })
        .catch(err => {
            console.log(err);
            result.status = "failed";
            result.message = "error occurred finding event";
            return res.status(500).send(result);
        });
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding user";
        return res.status(500).send(result);
    });
}

exports.allOrders = (req, res) => {
    var result = {};

    Order.find()
    .populate('event')
    .populate('user')
    .populate('paymentCard')
    .then(orders => {
        result.status = "success";
        result.orders = orders;
        result.message = "orders found: " + orders.length;
        return res.status(200).send(result);
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding orders";
        return res.status(500).send(result);
    });
}

exports.getAnOngoingOrder = (req, res) => {
    var result = {};

    var orderId = req.body.orderId;

    Order.findOne({_id: orderId})
    .then(order => {
        if(!order){
            result.status = "failed";
            result.message = "order does not exist";
            return res.status(404).send(result); 
        }

        result.status = "success";
        result.message = "order found";
        result.order = order;
        return res.status(200).send(result)
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding order";
        return res.status(500).send(result);
    });
}

exports.cancelOrder = (req, res) => {
    var result = {};

    var userId = req.body.userId;
    var orderId = req.body.orderId;

    User.findOne({_id: userId})
    .then(user => {
        if(!user){
            result.status = "failed";
            result.message = "user account does not exist";
            return res.status(404).send(result); 
        }

        Order.findOne({_id: orderId})
        .then(order => {
            if(!order){
                result.status = "failed";
                result.message = "order does not exist";
                return res.status(404).send(result); 
            }

            order.status = "cancelled";
            Order.updateOne({_id: order._id}, order)
            .then(dd => {
                result.status = "success";
                result.message = "order cancelled successfully";
                return res.status(200).send(result); 
            })
            .catch(err => {
                console.log(err);
                result.status = "failed";
                result.message = "error occurred cancelling order";
                return res.status(500).send(result);
            });
        })
        .catch(err => {
            console.log(err);
            result.status = "failed";
            result.message = "error occurred finding order";
            return res.status(500).send(result);
        });
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding user";
        return res.status(500).send(result);
    });


}

exports.allUserOrders = (req, res) => {
    var result = {};

    var userId = req.query.userId;
    var page = req.query.page;
    var perPage = 20;

    if(!page){
        page = 1;
    }

    Order.countDocuments({userId: userId})
    .then(count => {

        Order.find({userId: userId})
        .skip((perPage * page) - perPage)
        .limit(perPage)
        .populate('event', {tickets: 0})
        .populate('user', {password: 0, events: 0, })
        .populate('paymentCard')
        .sort('-updatedAt')
        .then(orders => {
            result.status = "success";
            result.page = page;
            result.total = count;
            result.perPage = perPage;
            result.message = "orders found: " + count;
            result.orders = orders;
            return res.status(200).send(result);
        })
        .catch(error => {
            result.status = "failed";
            result.message = "error finding user orders";
            return res.status(500).send(result);
        });

    })
    .catch(error => {
        result.status = "failed";
        result.message = "error counting user orders";
        return res.status(500).send(result);
    });

}