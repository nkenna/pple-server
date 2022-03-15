const db = require("../models");
const User = db.users;
const Event = db.events;
const Location = db.locations;
const Admin = db.admins;
const Ticket = db.tickets;
const ChildTicket = db.childtickets;
const Guest = db.guests;
const Join = db.joins;
const Invite = db.invites;
const Device = db.devices;
const Notification = db.notifications;

const os = require('os');
var fs = require('fs');

const path = require("path");
var mime = require('mime');
var tools = require('../config/utils');
const cryptoRandomString = require('crypto-random-string');
const moment = require("moment");
var AdminFB = require("firebase-admin");
var axios = require('axios');

exports.createInvite = (req, res) => {
    var result = {};

    var inviterId = req.body.inviterId;
    var inviteeId = req.body.inviteeId;
    var eventId = req.body.eventId;

    User.findOne({_id: inviterId})
    .select("-password")
    .then(inviter => {
        if(!inviter){
            result.status = "failed";
            result.message = "inviter not found";
            return res.status(404).send(result); 
        }

        User.findOne({_id: inviteeId})
        .select("-password")
        .then(invitee => {
            if(!invitee){
                result.status = "failed";
                result.message = "invitee not found";
                return res.status(404).send(result); 
            }

            Event.findOne({_id: eventId})
            .then(event => {
                if(!event){
                    result.status = "failed";
                    result.message = "event not found";
                    return res.status(404).send(result); 
                }

                // push notification to invitee device
                Device.findOne({userId: invitee._id})
                .then(device => {
                    if(device){
                        var payload = {
                            title: "new invite",
                            inviter: inviter,
                            data: event,
                        };

                        var body = inviter.username + " sent an invite to a new experience.";
                        tools.pushMessageToDeviceWithData(
                            device.token,
                            "New Experience Invite",
                            body,
                            payload
                        );

                        // create new notification data
                        var notification = new Notification({
                            type: "invite",
                            message: body,
                            inviteeId: invitee._id,
                            invitee: invitee._id,

                            eventId: event._id,
                            event: event._id,

                            inviterId: inviter._id,
                            inviter: inviter._id,
                        });

                        notification.save(notification)
                        .then(notif => console.log('notification saved'))
                        .catch(err => console.log("error saving notification"));
                    }
                })
                .catch(err => console.log("error finding device"));

                // save invite
                var invite = new Invite({
                    inviteMsg: inviter.username + " sent an invite to a new experience.",
                    inviterId: inviter._id,
                    inviteeId: invitee._id,
                    eventId: event._id,
                    event: event._id,
                    inviter: inviter._id,
                    invitee: invitee._id,
                });

                invite.save(invite)
                .then(newInvite => {
                    result.status = "success";
                    result.invite = newInvite;
                    result.message = "invite sent successfully";
                    return res.status(200).send(result);
                })
                .catch(error => {
                    result.status = "failed";
                    result.message = "error sending invite: " + error.message;
                    return res.status(500).send(result);
                });
            })
            .catch(error => {
                result.status = "failed";
                result.message = "error finding event";
                return res.status(500).send(result);
            });
        })
        .catch(error => {
            result.status = "failed";
            result.message = "error finding invitee";
            return res.status(500).send(result);
        });
    })
    .catch(error => {
        result.status = "failed";
        result.message = "error finding inviter";
        return res.status(500).send(result);
    });
}

