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
    var inviteeIds = req.body.inviteeIds;
    var eventId = req.body.eventId;

    console.log(inviteeIds);

    if(!inviteeIds){
        result.status = "failed";
        result.message = "invitees is required";
        return res.status(400).send(result); 
    }

    if(inviteeIds.length == 0){
        result.status = "failed";
        result.message = "invitees must be greated than zero";
        return res.status(400).send(result); 
    }

    //console.log(inviteeIds[0]);

    User.findOne({_id: inviterId})
    .select("-password")
    .then(inviter => {
        if(!inviter){
            result.status = "failed";
            result.message = "inviter not found";
            return res.status(404).send(result); 
        }

        inviteeIds.forEach(async(invId) => {
            let foundInvite = await Invite.findOne({inviterId: inviterId, inviteeId: invId, accepted: false, eventId: eventId}).exec();
            if(foundInvite != null){
                return;
            }
            User.findOne({_id: invId})
            .select("-password")
            .then(invitee => {
                if(invitee){
                    //console.log("this invitee not found");
                    Event.findOne({_id: eventId})
                    .then(event => {
                        if(event){
                            console.log("event not found");
                            // save invite
                            var invite = new Invite({
                                inviteMsg: inviter.username + " sent an invite to a new experience",
                                inviterId: inviter._id,
                                inviteeId: invitee._id,
                                eventId: event._id,
                                event: event._id,
                                inviter: inviter._id,
                                invitee: invitee._id,
                                
                            });
        
                            invite.save(invite)
                            .then(newInvite => {
                                event.sentInvites = event.sentInvites + 1;
        
                                // update
                                Event.updateOne({_id: event._id}, event)
                                .then(de => console.log('event updated'))
                                .catch(err => console.log('error updating event'));
        
                                // push notification to invitee device
                                Device.findOne({userId: invitee._id})
                                .then(device => {
                                    if(device){
                                        var payload = {
                                            "title": "new invite",
                                            "inviter": inviter._id.toString(),
                                            "event": event._id.toString(),
                                        };
        
                                        var body = inviter.username + " sent an invite to a new experience.";
                                        tools.pushMessageToDeviceWithData(
                                            device.token,
                                            "New Experience Invite",
                                            body,
                                            payload
                                        );
        
                                        
                                    }
                                })
                                .catch(err => console.log("error finding device"));

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

                                    ownerId: invitee._id,
                                    owner: invitee._id,

                                    
                                });

                                notification.save(notification)
                                .then(notif => console.log('notification saved'))
                                .catch(err => console.log("error saving notification"));
        
                                
                            })
                            .catch(error => {
                                console.log("error sending invite: " + error.message);
                            });
                        }
    
                        
    
                        
                    })
                    .catch(error => {
                        console.log("error finding event");
                    });
                }

                
            })
            .catch(error => {
                console.log("error finding invitee");
            });
      
        });

        

        result.status = "success";
        result.message = "invite sent successfully";
        return res.status(200).send(result);



        
    })
    .catch(error => {
        result.status = "failed";
        result.message = "error finding inviter";
        return res.status(500).send(result);
    });
}

exports.inviteToEvents = (req, res) => {
    var result = {};
    

    var inviterId = req.body.inviterId;
    var inviteeId = req.body.inviteeId;
    var eventIds = req.body.eventIds;

    console.log(eventIds);

    if(!eventIds){
        result.status = "failed";
        result.message = "events data are required";
        return res.status(400).send(result); 
    }

    if(eventIds.length == 0){
        result.status = "failed";
        result.message = "events data must be greated than zero";
        return res.status(400).send(result); 
    }

    //console.log(inviteeIds[0]);

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
        .then(async(invitee) => {
            if(!invitee){
                result.status = "failed";
                result.message = "invitee not found";
                return res.status(404).send(result); 
            }

            for (let i = 0; i < eventIds.length; i++) {

                let foundInvite = await Invite.findOne({inviterId: inviterId, inviteeId: invitee._id, accepted: false, eventId: eventIds[i]}).exec();
                if(foundInvite != null){
                    continue;
                }
                
                Event.findOne({_id: eventIds[i]})
                .then(event => {
                    if(event){
                        console.log("event found");
                        // save invite
                        var invite = new Invite({
                            inviteMsg: inviter.username + " sent an invite to a new experience",
                            inviterId: inviter._id,
                            inviteeId: invitee._id,
                            eventId: event._id,
                            event: event._id,
                            inviter: inviter._id,
                            invitee: invitee._id,
                        });
            
                        invite.save(invite)
                        .then(newInvite => {
                            event.sentInvites = event.sentInvites + 1;
                
                            // update
                            Event.updateOne({_id: event._id}, event)
                            .then(de => console.log('event updated'))
                            .catch(err => console.log('error updating event'));
                
                            // push notification to invitee device
                            Device.findOne({userId: invitee._id})
                            .then(device => {
                                if(device){
                                    var payload = {
                                    "title": "new invite",
                                    "inviter": inviter._id.toString(),
                                    "event": event._id.toString(),
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
                                    ownerId: invitee._id,
                                    owner: invitee._id,
                                });
                
                                notification.save(notification)
                                .then(notif => console.log('notification saved'))
                                .catch(err => console.log("error saving notification"));
                            }
                            })
                            .catch(err => console.log("error finding device"));
            
                                    
                        })
                        .catch(error => {
                            console.log("error sending invite: " + error.message);
                        });
                    }
                })
                .catch(error => {
                    console.log(error);
                });
                
            }  
            
            result.status = "success";
            result.message = "invites sent successfully";
            return res.status(200).send(result);

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

exports.recallInvite = (req, res) => {
    var result = {};

    var inviteId = req.body.inviteId;
    var userId = req.body.userId;

    User.findOne({_id: userId})
    .then(user => {
        if(!user){
            result.status = "failed";
            result.message = "user not found";
            return res.status(404).send(result); 
        }

        Invite.findOne({_id: inviteId})
        .then(invite => {
            if(!invite){
                result.status = "failed";
                result.message = "invite data not found";
                return res.status(404).send(result); 
            }

            Event.findOne({_id: invite.eventId})
            .then(event => {
                if(!event){
                    result.status = "failed";
                    result.message = "event data not found";
                    return res.status(404).send(result); 
                } 

                // delete this invite
                Invite.deleteOne({_id: invite._id})
                .then(dd => {
                    if(invite.accepted != null && invite.accepted == true){
                        // increase accepted invites if true
                        event.acceptedInvites = event.acceptedInvites - 1;
                    }
                    else if(invite.accepted != null && invite.accepted == false){
                        // increase rejected invites if false
                        event.rejectedInvites = event.rejectedInvites - 1;
                    }
                    event.sentInvites = event.sentInvites - 1;

                    // update
                    Event.updateOne({_id: event._id}, event)
                    .then(de => console.log('event updated'))
                    .catch(err => console.log('error updating event'));

                    Device.findOne({userId: invite.inviteeId})
                    .then(device => {
                        if(device){
                            
                            tools.pushMessageToDeviceWithData(
                                device.token,
                                "Invite recalled",
                                "Your invite to " + event.title + " have been recalled"
                            );
                        }
                    })
                    .catch(err => console.log("error finding user device"));

                    result.status = "success";
                    result.message = "invite deleted and recalled";
                    return res.status(200).send(result); 
                })
                .catch(error => {
                    result.status = "failed";
                    result.message = "error finding deleting invite";
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
            result.message = "error finding invite";
            return res.status(500).send(result);
        });
    })
    .catch(error => {
        result.status = "failed";
        result.message = "error finding user";
        return res.status(500).send(result);
    });
}

exports.recentInvites = (req, res) => {
    var result = {};

    var inviterId = req.query.inviterId;
    var page = req.query.page;
    var perPage = 20;

    if(!page){
        page = 1;
    }

    Invite.countDocuments({inviterId: inviterId})
    .then(count => {

        Invite.find({inviterId: inviterId})
        .skip((perPage * page) - perPage)
        .limit(perPage)
        .populate('event')
        .populate('inviter', {password: 0})
        .populate('invitee', {password: 0})
        .then(userInvites => {
            result.status = "success";
            result.page = page;
            result.total = count;
            result.perPage = perPage;
            result.message = "invites found: " + count;
            result.invites = userInvites;
            return res.status(200).send(result);
        })
        .catch(error => {
            result.status = "failed";
            result.message = "error finding invites";
            return res.status(500).send(result);
        });

    })
    .catch(error => {
        result.status = "failed";
        result.message = "error counting invites";
        return res.status(500).send(result);
    });
  

    

}

exports.suggestedUsersToInvite = (req, res) => {
    var result = {};

    var userId = req.query.userId;

    User.countDocuments({ $nor: [ { _id: userId }]  })
    .then(count => {
        User.find({ $nor: [ { _id: userId }]  })
        .select("firstname lastname bio verified status username avatar email")
        .skip(Math.random()* count)
        .limit(20)
        .then(suggestions => {
            result.status = "success";
            result.message = "suggestions found: " + suggestions.length;
            result.userSuggestions = suggestions;
            return res.status(200).send(result);
        })
        .catch(error => {
            result.status = "failed";
            result.message = "error finding suggestions";
            return res.status(500).send(result);
        });
    })
    .catch(error => {
        result.status = "failed";
        result.message = "error counting users";
        return res.status(500).send(result);
    });
    
}

exports.requestToJoinEvent = (req, res) => {
    var result = {};

    var userId = req.body.userId;
    var eventId = req.body.eventId;

    Event.findOne({_id: eventId})
    .then(event => {
        if(!event){
            result.status = "failed";
            result.message = "event not found";
            return res.status(404).send(result); 
        }

        User.findOne({_id: userId})
        .then(async(requester) => {
            if(!requester){
                result.status = "failed";
                result.message = "user not found";
                return res.status(404).send(result); 
            }

            let foundInvite = await Invite.findOne({inviterId: event.hostById, inviteeId: requester._id, accepted: false, eventId: eventIds[i]}).exec();
            if(foundInvite != null){
                result.status = "failed";
                result.message = "you already have a pending invite to this pple";
                return res.status(409).send(result); 
            }

            // save invite
            var invite = new Invite({
                inviteMsg: requester.username + " requested to join your PPLE",
                inviterId: event.hostById,
                inviteeId: requester._id,
                eventId: event._id,
                event: event._id,
                inviter: event.hostById,
                invitee: event.hostById,
            });


            invite.save(invite)
            .then(newInvite => {
                event.sentInvites = event.sentInvites + 1;

                // update
                Event.updateOne({_id: event._id}, event)
                .then(de => console.log('event updated'))
                .catch(err => console.log('error updating event'));

                // push notification to invitee device
                Device.findOne({userId: event.creatorId})
                .then(device => {
                    if(device){
                        var data = {
                            title: "new invite request",
                            "requesterId": requester.Id.toString(),
                            "eventId": event._id.toString()
                        };
                        

                        var body = requester.username + " requested to join your PPLE";
                        tools.pushMessageToDeviceWithData(
                            device.token,
                            "Invite request",
                            body,
                            data
                        );

                        // create new notification data
                        var notification = new Notification({
                            type: "invite request",
                            message: body,
                            inviteeId: requester.Id,
                            invitee: requester.Id,

                            eventId: event._id,
                            event: event._id,

                            inviterId: event.creatorId,
                            inviter: event.creatorId,

                            ownerId: event.creatorId,
                            owner: event.creatorId
                        });

                        notification.save(notification)
                        .then(notif => console.log('notification saved'))
                        .catch(err => console.log("error saving notification"));
                    }
                })
                .catch(err => console.log("error finding device"));

                result.status = "success";
                result.invite = newInvite;
                result.message = "invite request sent successfully";
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
            result.message = "error finding user: " + error.message;
            return res.status(500).send(result);
        });
    })
    .catch(error => {
        result.status = "failed";
        result.message = "error finding pple: " + error.message;
        return res.status(500).send(result);
    });

}

exports.acceptOrRejectInviteRequest = (req, res) => {
    var result = {};

    var inviterId = req.body.inviterId;
    var inviteId = req.body.inviteId;
    var status = req.body.status;
    var inviteeId = req.body.inviteeId;

    Invite.findOne({_id: inviteId})
    .then(invite => {
        if(!invite){
            result.status = "failed";
            result.message = "invite data not found";
            return res.status(404).send(result); 
        }
        
        if(invite.inviteeId != inviteeId){
            result.status = "failed";
            result.message = "you are not allowed to perform this action";
            return res.status(403).send(result); 
        }

        if(invite.inviterId != inviterId){
            result.status = "failed";
            result.message = "you are not allowed to perform this action";
            return res.status(403).send(result); 
        }

        invite.accepted = status != null && status == true ? true: false;
        Invite.updateOne({_id: invite._id}, invite)
        .then(dd => {

            // increase invite count
            Event.findOne({_id: invite.eventId})
            .then(event => {
                if(event){
                    if(status == true){
                        // increase accepted invites if true
                        event.acceptedInvites = event.acceptedInvites + 1;
                    }else{
                        // increase rejected invites if false
                        event.rejectedInvites = event.rejectedInvites + 1;
                    }

                    // update
                    Event.updateOne({_id: event._id}, event)
                    .then(de => {
                        console.log('event updated');
                        // subscribe to chat room
                        if(status = true){
                            Device.findOne({userId: invite.inviteeId})
                            .then(device => {
                                if(device){
                                    tools.subscribeToChatRoom(event.eventRoomId, device.token)
                                }
                            })
                            .catch(err => console.log("error finding invitee device"));
                        }
                       
                        
                    })
                    .catch(err => console.log('error updating event'));
                }
            })
            .catch(error => console.log('error finding event'));
            // send push notification to chat room event
            Device.findOne({userId: invite.inviterId})
            .then(device => {
                if(device){
                    var data = {
                        "inviteId": invite._id.toString()
                    };

                    if(status == true){
                        tools.pushMessageToDeviceWithData(
                            device.token,
                            "Joined Chat",
                            "someone just joined your PPLE chat room",
                            data
                        );
                    }

                    tools.pushMessageToDeviceWithData(
                        device.token,
                        status ? "invite request accepted" : "invite request rejected",
                        status ? "you have accepted invite request" : "you have rejected invite request",
                        data
                    );
                }
            })
            .catch(err => console.log("error finding user device"));

            // send push notification to invitee
            Device.findOne({userId: invite.inviteeId})
            .then(device => {
                if(device){
                    var data = {
                        "inviteId": invite._id.toString()
                    };

                    
                  

                    tools.pushMessageToDeviceWithData(
                        device.token,
                        status ? "invite request accepted" : "invite request rejected",
                        status ? "your join request have been accepted" : "your join request have been rejected",
                        data
                    );
                }
            })
            .catch(err => console.log("error finding user device"));

            result.status = "success";
            result.message = status ? "invite accepted" : "invite rejected";
            return res.status(200).send(result); 
        })
        .catch(error => {
            result.status = "failed";
            result.message = "error updating invite";
            return res.status(500).send(result);
        });

    })
    .catch(error => {
        result.status = "failed";
        result.message = "error finding invite";
        return res.status(500).send(result);
    });

}

exports.searchInvites = (req, res) => {
    var result = {};

    var query = req.query.search;

    const q = { $text: { $search: query} };
    console.log(q);

    User.find(q)
    .select("firstname lastname bio verified status username avatar email")
    .then(searchResults => {
        result.status = "success";
        result.message = "users found: " + searchResults.length;
        result.searchResults = searchResults;
        return res.status(200).send(result);
    })
    .catch(error => {
        result.status = "failed";
        result.message = "error searching for users";
        return res.status(500).send(result);
    });
}

exports.requestedInvites = (req, res) => {
    var result = {};
    var hostId = req.query.hostId;
    var eventId = req.query.eventId;

    Invite.find({eventId: eventId, accepted: false, hostRequested: false, inviterId: hostId})
    .populate('event')
    .populate('inviter', {password: 0})
    .populate('invitee', {password: 0})
    .then(invites => {
        result.status = "success";
        result.message = "invites found: " + invites.length;
        result.invites = invites;
        return res.status(200).send(result);
    })
    .catch(error => {
        result.status = "failed";
        result.message = "error finding invites";
        return res.status(500).send(result);
    });
}

exports.userAcceptOrRejectInviteRequest = (req, res) => {
    var result = {};

    var inviterId = req.body.inviterId;
    var inviteId = req.body.inviteId;
    var status = req.body.status;
    var inviteeId = req.body.inviteeId;

    Invite.findOne({_id: inviteId})
    .then(invite => {
        if(!invite){
            result.status = "failed";
            result.message = "invite data not found";
            return res.status(404).send(result); 
        }
        
        if(invite.inviteeId != inviteeId){
            result.status = "failed";
            result.message = "you are not allowed to perform this action";
            return res.status(403).send(result); 
        }

        if(invite.inviterId != inviterId){
            result.status = "failed";
            result.message = "you are not allowed to perform this action";
            return res.status(403).send(result); 
        }

        if(invite.accepted == true){
            result.status = "failed";
            result.message = "invited have already been accepted";
            return res.status(419).send(result); 
        }

        invite.accepted = status != null && status == true ? true: false;
        Invite.updateOne({_id: invite._id}, invite)
        .then(dd => {

            // increase invite count
            Event.findOne({_id: invite.eventId})
            .then(event => {
                if(event){
                    if(status == true){
                        // increase accepted invites if true
                        event.acceptedInvites = event.acceptedInvites + 1;
                    }else{
                        // increase rejected invites if false
                        event.rejectedInvites = event.rejectedInvites + 1;
                    }

                    // update
                    Event.updateOne({_id: event._id}, event)
                    .then(de => {
                        console.log('event updated');
                        // subscribe to chat room
                        if(status = true){
                            Device.findOne({userId: invite.inviteeId})
                            .then(device => {
                                if(device){
                                    tools.subscribeToChatRoom(event.eventRoomId, device.token)
                                }
                            })
                            .catch(err => console.log("error finding invitee device"));
                        }
                       
                        
                    })
                    .catch(err => console.log('error updating event'));
                }
            })
            .catch(error => console.log('error finding event'));
            // send push notification to chat room event
            Device.findOne({userId: invite.inviterId})
            .then(device => {
                if(device){
                    var data = {
                        "inviteId": invite._id.toString()
                    };

                    if(status == true){
                        tools.pushMessageToDeviceWithData(
                            device.token,
                            "Joined Chat",
                            "someone just joined your PPLE chat room",
                            data
                        );
                    }

                    tools.pushMessageToDeviceWithData(
                        device.token,
                        status ? "invite request accepted" : "invite request rejected",
                        status ? "your invite request have been accepted" : "your invite request have been rejected",
                        data
                    );
                }
            })
            .catch(err => console.log("error finding user device"));

            // send push notification to invitee
            Device.findOne({userId: invite.inviteeId})
            .then(device => {
                if(device){
                    var data = {
                        "inviteId": invite._id.toString()
                    };

                    
                  

                    tools.pushMessageToDeviceWithData(
                        device.token,
                        status ? "invite request accepted" : "invite request rejected",
                        status ? "you have accepted an invite request" : "you have rejected an invite request",
                        data
                    );
                }
            })
            .catch(err => console.log("error finding user device"));

            // create new notidfication data for inviterId
            var notification = new Notification({
                type: "invite",
                message: status ? "your invite request have been accepted" : "your invite request have been rejected",
                inviteeId: inviteeId,
                invitee: inviteeId,

                eventId: invite.eventId,
                event: invite.eventId,

                inviterId: inviterId,
                inviter: inviterId,

                ownerId: inviterId,
                owner: inviterId,

                
            });

            notification.save(notification)
            .then(noti => console.log('notification saved'))
            .catch(err => console.log("error saving notification"));


            result.status = "success";
            result.message = status ? "invite accepted" : "invite rejected";
            return res.status(200).send(result); 
        })
        .catch(error => {
            console.log(error);
            result.status = "failed";
            result.message = "error updating invite: " + error.message;
            return res.status(500).send(result);
        });

    })
    .catch(error => {
        result.status = "failed";
        result.message = "error finding invite";
        return res.status(500).send(result);
    });

}



