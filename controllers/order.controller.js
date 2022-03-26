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
const cryptoRandomString = require('crypto-random-string')
const moment = require('moment')
var tools = require('../config/utils');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const stripe = require('stripe')('sk_test_4eC39HqLyjWDarjtT1zdp7dc');

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

            // calculate charges
            var amt = event.price * quantity;

            var charges = tools.calculateHostTipCommission(amt, 5.8) + 0.30;

            // calculate vat subcharge
            var vatSubTotal = tools.calculateHostTipCommission(amt, 10); // lets keep VAT at 10%

            var total = vatSubTotal + charges + amt;
            var subtotal = total - (vatSubTotal + charges);

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
                event: event._id,
                //paymentCard: { type: mongoose.Schema.Types.ObjectId, ref: 'card' }
            });

            order.save(order)
            .then(newOrder => {
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

        order.hostTip = tipAmount;
        if(tipAmount == 0){
            order.total = order.total - order.hostTip;
            order.appliedTip = false;
        }else if(tipAmount > 0){
            order.total = order.total + tipAmount;
            order.appliedTip = true;
        }
        
        order.subtotal = order.total - (order.vatSubTotal + order.charges);

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
    var guests = req.body.guests;

    if(guests.length != quantity){
        result.status = "failed";
        result.message = "number of guests is greater than quantity of orders made, guest list must match oeder quantity";
        return res.status(409).send(result); 
    }

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

                // gretrieve customer from stripe
                stripe.customers.retrieve(
                    user.stripeCustomerId
                )
                .then(customerData => {
                    console.log(customerData.default_source);
                    // create charge object with customer default card
                    stripe.charges.create({
                        amount: order.total * 100,
                        currency: 'usd',
                        source: customerData.default_source,
                        description: 'My First Test Charge (created for API docs)',
                        customer: customerData.id
                    })
                    .then(chargeData => {

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
                                // save guest from guests list
                                for (let i = 0; i < guests.length; i++) {
                                    var guest = guests[i];
                                    // check if guest is a registered user
                                    // if not a registered user create account

                                    User.findOne({ email: {$regex : guest.email, $options: 'i'}})
                                    .then(user => {
                                        if(user){ // guest found as registered user
                                            var g = new Guest({
                                                firstname: guest.firstname,
                                                lastname: guest.lastname,
                                                phone: guest.phone,
                                                email: guest.email,
                                                type: 'guest',
                                                orderId: order._id,
                                                order: order._id,
                                                userId: user._id,
                                                user: user._id,
                                                eventId: event._id,
                                                event: event._id
                                            });

                                            g.save(g)
                                            .then(newGuest => {
                                                order.guests.push(newGuest._id);
                                                Device.findOne({userId: user._id})
                                                .then(device => {
                                                    if(device){
                                                        var data = {
                                                            "userId": followed._id.toString(),
                                                            "guestId": newGuest.id.toString(),
                                                            "eventId": event._id.toString()
                                                        };
                                                        tools.pushMessageToDeviceWithData(
                                                            device.token,
                                                            "New Event Guest",
                                                            "You have been added as a guest to an event on PPLE platform",
                                                            data
                                                        );
                                                    }
                                                })
                                                .catch(err => console.log("error finding follower device"));
                                            })
                                            .catch(err => console.log("error saving new guest"));
                                        }
                                        else { // guest is not a registered user
                                            // create new user account
                                            bcrypt.hash(cryptoRandomString({length: 20, type: 'alphanumeric'}), saltRounds, (err, hash) => {
                                                // Now we can store the password hash in db.
                                                
                                                if(err){
                                                    console.log("unknown error occurred with password");
                                                }
                                        
                                                var newUser = new User({
                                                    firstname: guest.firstname,
                                                    lastname: guest.lastname,
                                                    phone: guest.phone,
                                                    email: guest.email,
                                                    password: hash
                                                    //username: username
                                                });
                                    
                                                    
                                                newUser.save(newUser)
                                                .then(nuser => {
                                                    // create a guest
                                                    var g = new Guest({
                                                        firstname: guest.firstname,
                                                        lastname: guest.lastname,
                                                        phone: guest.phone,
                                                        email: guest.email,
                                                        type: 'guest',
                                                        orderId: order._id,
                                                        order: order._id,
                                                        userId: nuser._id,
                                                        user: nuser._id,
                                                        eventId: event._id,
                                                        event: event._id
                                                    });

                                                    g.save(g)
                                                    .then(nG => {
                                                        order.guests.push(nG._id);
                                                        console.log("guest saved successfully");
                                                    })
                                                    .catch(err => console.log("error saving new guest"));
                                                    // create user wallet
                                                    var wallet = new Wallet({
                                                        walletRef: cryptoRandomString({length: 6, type: 'alphanumeric'}) + cryptoRandomString({length: 6, type: 'alphanumeric'}),
                                                        userId: nuser._id,
                                                        user: nuser._id
                                                    });
                                    
                                                    wallet.save(wallet)
                                                    .then(wa => {
                                                        console.log("user wallet created");
                                                        nuser.wallet = wa._id;
                                                        User.updateOne({_id: nuser._id}, nuser)
                                                        .then(wa => console.log("user updated"))
                                                        .catch(err => console.log("error updating user"));
                                    
                                                    })
                                                    .catch(err => console.log("error creating wallet"));
                                                    
                                                    // creating stripe customer
                                                    stripe.customers.create({
                                                        description: "PPLE Event host",
                                                        name: nuser.firstname + " " + nuser.lastname,
                                                        email: nuser.email,
                                                    })
                                                    .then(customerData => {
                                                        console.log(customerData);
                                            
                                                        if(customerData.id){
                                                            //var stripeData = customerData.stripeCustomer;
                                            
                                                            //update customer ID of user
                                                            nuser.stripeCustomerId = customerData.id;
                                            
                                                            User.updateOne({_id: nuser._id}, nuser)
                                                            .then(da => console.log("user have been updated"))
                                                            .catch(err => console.log("error occurred updating user"));
                                                        }else{
                                                            console.log("stripe operation failed");
                                                        }
                                                        
                                                    })
                                                    .catch(err => console.log("error creating strip customer: " + err));
                                    
                                                
                                                        
                                                    // send verification email
                                                    var vcode = new VerifyCode({
                                                        code: cryptoRandomString({length: 6, type: 'alphanumeric'}),
                                                        email: nuser.email,
                                                        userId: nuser._id
                                                    });
                                        
                                                    vcode.save(vcode)
                                                    .then(vc => {
                                                        console.log("done creating verification code");
                                                    
                                                        var emailtext = "<p>A new PPLE account was created for you because you were added as a guest for one of its events. To verify your account. Click on this link or copy to your browser: " +
                                                        "https://pple.com/verify-account/" + vc.code + " or paste this code on the provided field: "+ vc.code + " </p>";
                                    
                                                        tools.sendEmail(
                                                            nuser.email,
                                                            "New PPLE Account Verification",
                                                            emailtext
                                                        );
                                                    })
                                                    .catch(err => console.log("error sending email: " + err));
                                        
                                                });
                                            });
                                            // end of create user
                                        }
                                    })
                                    
                                }
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