const db = require("../models");
const User = db.users;
const ResetCode = db.resetcodes;
const Admin = db.admins;
const Event = db.events;
const Bank = db.banks;
const ConnectedAccount = db.connectaccounts;
const Wallet = db.wallets;
const WalletTrans = db.wallettrans;
const PayoutTrans = db.payouttrans;
const os = require('os');
var fs = require('fs');
const path = require("path");
var mime = require('mime');
var tools = require('../config/utils');
const cryptoRandomString = require('crypto-random-string');
const moment = require("moment");
var axios = require('axios');
var FormData = require('form-data')
const bcrypt = require('bcrypt');
const saltRounds = 10;
const ExcelJS = require('exceljs');

const stripe = require('stripe')(process.env.STRIPE_API_KEY);

exports.addHostAsCustomer = (req, res) => {
    var result = {};

    var hostEmail = req.body.hostEmail;
    var hostId = req.body.hostId;

    if(!hostEmail){
        result.status = "failed";
        result.message = "host email is required";
        return res.status(400).send(result);
    }

    User.findOne({_id: hostId})
    .then(user => {
        if(!user){
            result.status = "failed";
            result.message = "no user account found";
            return res.status(404).send(result);
        }

        if(user.isHost == false){
            result.status = "failed";
            result.message = "user is not yet a host";
            return res.status(400).send(result);
        }

        // add user as a customer on stripe
        stripe.customers.create({
            description: "PPLE Event host",
            name: user.firstname + " " + user.lastname,
            email: user.email,
        })
        .then(customerData => {
            console.log(customerData);

            if(customerData.id){
                //var stripeData = customerData.stripeCustomer;

                //update customer ID of user
                user.stripeCustomerId = customerData.id;

                User.updateOne({_id: user._id}, user)
                .then(da => console.log("user have been updated"))
                .catch(err => console.log("error occurred udating user"));

                result.status = "success";
                result.message = "host added as stripe customer";
                result.customerId = user.stripeCustomerId;
                return res.status(200).send(result);
            

            }else{
                result.status = "failed";
                result.message = "stripe operation failed";
                return res.status(400).send(result);
            }
            
        })
        .catch(error => {
            console.error(error.message);
            result.status = "failed";
            result.message = error.message;
            return res.status(err.statusCode).send(result);
        
        });

    })
    .catch(error => {
        result.status = "failed";
        result.message = "error finding user";
        return res.status(500).send(result);
    });

     
}

exports.createHostStripeAccount = (req, res) => {
    var result = {};    
    var country = req.body.country;
    var email = req.body.email;
    var userId = req.body.userId;

    if(!email){
        result.status = "failed";
        result.message = "email is required";
        return res.status(400).send(result);
    }

    if(!country){
        result.status = "failed";
        result.message = "country is required";
        return res.status(400).send(result);
    }

    if(country.length > 2){
        result.status = "failed";
        result.message = "this should be an ISO 3166-1 alpha-2 country code";
        return res.status(400).send(result);
    }

    User.findOne({_id: userId})
    .then(user => {
        if(!user){
            result.status = "failed";
            result.message = "no user account found";
            return res.status(404).send(result);
        }

        // add bank info to stripe
        stripe.accounts.create(
            {
                type: 'custom',
                country: country,
                email: user.email,
                business_profile: {
                    name: user.firstname + " " + user.lastname
                },
                business_type: "individual",
                individual: {
                    email: user.email,
                    first_name: user.firstname,
                    last_name: user.lastname,
                    phone: "202-555-0161",
                    id_number: "223444555",
                    dob: {
                        day: 2,
                        month: 2,
                        year: 1990
                    },
                    address: {
                        city: "addison",
                        line1: "school",
                        postal_code: "75001",
                        state: "texas",

                    },
              
                },
                capabilities: {
                    card_payments: {requested: true},
                    transfers: {requested: true},
            },
          
            }
        )
        .then(ccData => {
            //console.log(ccData.login_links.url);
            
            if(ccData.id){// successful
                // create new bank data
                var cc = new ConnectedAccount({
                    accountId: ccData.id,
                    name: ccData.business_profile.name,
                    accountType: ccData.type,
                    country: ccData.country,
                    currency: ccData.default_currency,
                    email: ccData.email,
                    created: ccData.created,
                    //loginUrl: ccData.login_links.url,
                    //timeZone: ccData.dashboard.timezone,
                    userId: user._id,
                    user: user._id
                });

                cc.save(cc)
                .then(bk => {
                    user.accountId = bk.accountId;
                    user.connectedaccount = bk._id;

                    User.updateOne({_id: user._id}, user)
                    .then(wa => console.log("user updated"))
                    .catch(err => console.log("error updating user"));

                    result.status = "success";
                    result.accountData = ccData;
                    result.message = "stripe connected account info added successful";
                    return res.status(200).send(result);
                })
                .catch(error => {
                    result.status = "failed";
                    result.message = "error saving stripe connected account";
                    return res.status(500).send(result);
                });
            }
        })
        .catch(error => {
            console.log(error);
            result.status = "failed";
            result.message = error.message;
            return res.status(error.statusCode).send(result);
        });
    })
    .catch(error => {
        result.status = "failed";
        result.message = "error finding user";
        return res.status(500).send(result);
    });

    
}

exports.addHostBankInfo = (req, res) => {
    var result = {};

    var accountName = req.body.accountName;
    var accountType = req.body.accountType;
    var bankName = req.body.bankName;
    var accountNumber = req.body.accountNumber;
    var country = req.body.country;
    var currency = req.body.currency;
    var customerId = req.body.customerId;
    var routingNumber = req.body.routingNumber; // if not available, do not put it
    var userId = req.body.userId;

    if(!customerId){
        result.status = "failed";
        result.message = "stripe customer ID is required";
        return res.status(400).send(result);
    }

    User.findOne({_id: userId})
    .then(user => {
        if(!user){
            result.status = "failed";
            result.message = "no user account found";
            return res.status(404).send(result);
        }

        // add bank info to stripe
        stripe.customers.createSource(
            customerId,
            {
                source: {
                    "object": "bank_account",
                    "country": country,
                    "currency": currency,
                    //"bank_name": bankName,
                    "account_holder_name": accountName,
                    "account_holder_type": accountType,
                    "routing_number": routingNumber,
                    "account_number": accountNumber
                }
            }
        )
        .then(bankData => {
            console.log(bankData);
            if(bankData.id){// successful
                // create new bank data
                var bank = new Bank({
                    accountName: bankData.account_holder_name,
                    accountType: bankData.account_holder_type,
                    accountNumber: bankData.accountNumber,
                    bankName: bankName,
                    country: bankData.country,
                    currency: bankData.currency,
                    customerId: bankData.customer,
                    routingNumber: bankData.routing_number,
                    stripeBankId: bankData.id,
                    user: user._id
                });

                bank.save(bank)
                .then(bk => {
                    result.status = "success";
                    result.message = "bank info added successful";
                    return res.status(200).send(result);
                })
                .catch(error => {
                    result.status = "failed";
                    result.message = "error saving bank info";
                    return res.status(500).send(result);
                });
            }
        })
        .catch(error => {
            result.status = "failed";
            result.message = error.message;
            return res.status(err.statusCode).send(result);
        });
    })
    .catch(error => {
        result.status = "failed";
        result.message = "error finding user";
        return res.status(500).send(result);
    });

    
}

exports.tipHost = (req, res) => {
    var result = {};

    var hostId = req.body.hostId;
    var chargeId = req.body.chargeId;
    var tipperEmail = req.body.tipperEmail;

    if(!chargeId){
        result.status = "failed";
        result.message = "stripe charge ID is required";
        return res.status(400).send(result);
    }

   User.findOne({_id: hostId})
   .then(host => {
        if(!host){
            result.status = "failed";
            result.message = "no host account found";
            return res.status(404).send(result);
        }

        // find host wallet
        Wallet.findOne({userId: host._id})
        .then(wallet => {
            if(!host){
                result.status = "failed";
                result.message = "no wallet found";
                return res.status(404).send(result);
            }

            stripe.charges.retrieve(chargeId) 
            .then(chargeData => {
                if(chargeData.status == "succeeded"){
                    var amount = chargeData.amount / 100;
                    var ppleCommission = tools.calculateHostTipCommission(amount, 10);

                    var netCharge = amount - ppleCommission;

                    // credit user wallet
                    wallet.balance = wallet.balance + netCharge;
                    Wallet.updateOne({_id: wallet.id}, wallet)
                    .then(wa => {
                        console.log("wallet balance updated");

                        // create wallet transactions
                        var walletTrans = new WalletTrans({
                            walletRef: wallet.walletRef,
                            amount: netCharge,
                            commission: ppleCommission,
                            status: chargeData.status,
                            type: "TIP",
                            payerEmail: tipperEmail,   
                            chargeId: chargeId, 
                            wallet: wa._id,    
                            user: host._id
                        });

                        walletTrans.save(walletTrans)
                        .then(wt => console.log("wallet transaction created"))
                        .catch(err => console.log("error creating wallet transaction "));

                        result.status = "success";
                        result.wallet = wa;
                        result.message = "host tipped successfully";
                        return res.status(200).send(result);
                        
                    })
                    
                }
            })
            .catch(err => {
                console.log(err);
                result.status = "failed";
                result.message = err.message;
                return res.status(err.statusCode).send(result);
            });
        })
        .catch(err => {
            console.log(err);
            result.status = "failed";
            result.message = "error finding wallet";
            return res.status(500).send(result);
        });
   })
   .catch(err => {
    console.log(err);
    result.status = "failed";
    result.message = "error finding user";
    return res.status(500).send(result);
    });
    
}

exports.addWalletToHost = (req, res) => {
    var result = {};

    var userId = req.body.userId;

    User.findOne({_id: userId})
    .then(user => {
        if(!user){
            result.status = "failed";
            result.message = "no user account found";
            return res.status(404).send(result);
        }

        // make sure this user does not have wallet
        if(user.wallet){
            result.status = "failed";
            result.message = "user already has a wallet";
            return res.status(400).send(result); 
        }

        // make sure there is no wallet attached to this user
        Wallet.findOne({userId: user._id})
        .then(fWallet => {
            if(fWallet){
                result.status = "failed";
                result.message = "user already has a wallet";
                return res.status(400).send(result); 
            }

            // all is good, create a wallet for this user
            var wallet = new Wallet({
                walletRef: cryptoRandomString({length: 6, type: 'alphanumeric'}) + cryptoRandomString({length: 6, type: 'alphanumeric'}),
                userId: user._id,
                user: user._id
            });

            wallet.save(wallet)
            .then(wa => {
                // update user wallet field
                user.wallet = wa._id;
                User.updateOne({_id: user._id}, user)
                .then(wa => console.log("user updated"))
                .catch(err => console.log("error updating user"));

                result.status = "success";
                result.wallet = wa;
                result.message = "wallet added to user";
                return res.status(200).send(result);
            })
            .catch(err => {
                console.log(err);
                result.status = "failed";
                result.message = "error occurred saving wallet data";
                return res.status(500).send(result);
            });


        })
        .catch(err => {
            console.log(err);
            result.status = "failed";
            result.message = "error occurred finding wallet";
            return res.status(500).send(result);
        });

        
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding this user";
        return res.status(500).send(result);
    });
}

exports.payoutHostTip = (req, res) => {
    var result = {};

    var hostId = req.body.hostId;
    var amount = req.body.amount;
    var adminId = req.body.adminId;

    User.findOne({_id: hostId})
    .then(host => {
        if(!host){
            result.status = "failed";
            result.message = "no host account found";
            return res.status(404).send(result);
        }

        // find host wallet
        Wallet.findOne({userId: host._id})
        .then(wallet => {
            if(!wallet){
                result.status = "failed";
                result.message = "host wallet not found";
                return res.status(404).send(result);
            }

            // check if host have bank info
            ConnectedAccount.findOne({accountId: host.accountId})
            .then(bank => {
                if(!bank){
                    result.status = "failed";
                    result.message = "host stripe account info not found";
                    return res.status(404).send(result);
                }

                // payout from stripe
                stripe.transfers.create({
                    amount: amount * 100,
                    currency: 'usd',
                    description: 'pple host tip payout',
                    destination: bank.accountId,

                })
                .then(payoutData => {
                    console.log(payoutData);

                    if(payoutData.id){
                        // deduct balance from host wallet
                        wallet.balance = wallet.balance - (payoutData.amount / 100);

                        Wallet.updateOne({_id: wallet._id}, wallet)
                        .then(wa => console.log("wallet updated"))
                        .catch(err => console.log("error updating wallet"));

                        // create wallet transactions
                        var walletTrans = new WalletTrans({
                            walletRef: wallet.walletRef,
                            amount: (payoutData.amount / 100),
                            status: chargeData.status,
                            type: "PAYOUT", 
                            payoutId: payoutData.id, 
                            wallet: wallet._id,    
                            user: host._id
                        });

                        walletTrans.save(walletTrans)
                        .then(wt => console.log("wallet transaction created"))
                        .catch(err => console.log("error creating wallet transaction "));

                        // create payout transactions
                        var payoutTrans = new PayoutTrans({
                            walletRef: wallet.walletRef,
                            amount: (payoutData.amount / 100),
                            status: chargeData.status,  
                            admin: adminId,
                            payoutId: payoutData.id, 
                            wallet: wallet._id,    
                            user: host._id
                        });

                        payoutTrans.save(payoutTrans)
                        .then(wt => console.log("payout transaction created"))
                        .catch(err => console.log("error creating payout transaction "));

                    }
                })
                .catch(err => {
                    console.log(err);
                    result.status = "failed";
                    result.message = err.message;
                    return res.status(err.statusCode).send(result);
                });
            })
            .catch(err => {
                console.log(err);
                result.status = "failed";
                result.message = "error finding host bank info";
                return res.status(err.statusCode).send(result);
            });
        })
        .catch(err => {
            console.log(err);
            result.status = "failed";
            result.message = "error finding host wallet";
            return res.status(500).send(result);
        });

    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error finding user";
        return res.status(500).send(result);
    });
    
}

