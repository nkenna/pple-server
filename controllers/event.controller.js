const db = require("../models");
const User = db.users;
const Event = db.events;
const Location = db.locations;
const Admin = db.admins;
const Ticket = db.tickets;
const ChildTicket = db.childtickets;
const Guest = db.guests;

const os = require('os');
var fs = require('fs');

const path = require("path");
var mime = require('mime');
var tools = require('../config/utils');
const cryptoRandomString = require('crypto-random-string');
const moment = require("moment");
const bcrypt = require('bcrypt');
const saltRounds = 10;
const ExcelJS = require('exceljs');
var AdminFB = require("firebase-admin");
var axios = require('axios');
const stripe = require('stripe')(process.env.STRIPE_API_KEY);

//const stripe = require('stripe')(process.env.STRIPE_API_KEY);

exports.createEvent = (req, res) => {
    var result = {};

    var title = req.body.title;
    var detail = req.body.detail;
    var startDate = req.body.startDate;
    var endDate = req.body.endDate;
    var paid = req.body.paid;
    var creatorId = req.body.creatorId;
    var creatorType = req.body.creatorType;
    var recurring = req.body.recurring;
    var timeToNextStartDate = req.body.timeToNextStartDate;
    var timeToNextStartDateType = req.body.timeToNextStartDateType;
    var virtual = req.body.virtual;
    var virtualPlatform = req.body.virtualPlatform;
    var virtualLink = req.body.virtualLink;
    var location = req.body.location;

    if(virtual == null){
        result.status = "failed";
        result.message = "invalid data - is this event virtual or physical. please specify this field";
        return res.status(400).send(result);
    }

    if(virtual == true && (!virtualLink && virtualPlatform)){
        result.status = "failed";
        result.message = "this event is virtual. please specify virtual platform and link to join";
        return res.status(400).send(result);
    }

    if(!location){
        result.status = "failed";
        result.message = "event location is required";
        return res.status(400).send(result);
    }

    if(location && (!location.address || !location.city)){
        result.status = "failed";
        result.message = "event city and address is required";
        return res.status(400).send(result);
    }


    if(!title){
        result.status = "failed";
        result.message = "event title is required";
        return res.status(400).send(result);
    }

    if(paid == null){
        result.status = "failed";
        result.message = "this event must be paid or not paid";
        return res.status(400).send(result);
    }

    if(!creatorId){
        result.status = "failed";
        result.message = "creatorId is required";
        return res.status(400).send(result);
    }

    if(!creatorType){
        result.status = "failed";
        result.message = "creatorType is required";
        return res.status(400).send(result);
    }

    if(!startDate){
        result.status = "failed";
        result.message = "event start date is required";
        return res.status(400).send(result);
    }

    if(recurring == null){
        result.status = "failed";
        result.message = "this event must be recurring or one-time";
        return res.status(400).send(result);
    }

    if(recurring == true && !timeToNextStartDateType){
        result.status = "failed";
        result.message = "this event is recurring. please specify when to scehudlu the next start date.";
        return res.status(400).send(result);
    }

    if(timeToNextStartDateType &&  //hours, days, weeks, months or years
        (timeToNextStartDateType != "hours" || timeToNextStartDateType != "days" || timeToNextStartDateType != "weeks" || timeToNextStartDateType != "months" || timeToNextStartDateType != "years")
        ){
        result.status = "failed";
        result.message = "invalid time to next start date type- this event is recurring. please specify valid next to next start date type. it must be either hours, days, weeks, months or years";
        return res.status(400).send(result);
    }

    if(recurring == true && !timeToNextStartDate){
        result.status = "failed";
        result.message = "invalid time to next start date - this event is recurring. please specify valid next to next start date.";
        return res.status(400).send(result);
    }

    var ref = creatorId.substring(0, 8) + cryptoRandomString({length: 8, type: 'alphanumeric'});

    User.findOne({_id: creatorId})
    .then(user => {
        if(!user){
            result.status = "failed";
            result.message = "this host data was not found";
            return res.status(404).send(result);
        }

        // if recurring prepare next start date
        var newStartDate = "";
        if(recurring == true){
            if(timeToNextStartDateType == "hours"){
                var sD = new Date(startDate);
                sD.setHour(sD.getHours() + timeToNextStartDate);
                newStartDate = sD.toISOString();
            }
        }

        // create location data
        var loc = new Location({
            country: location.country,
            state: location.state,
            city: location.city,
            address: location.address,
            landmark: location.landmark,
            lat: location.lat,
            lon: location.lon,
            //eventId: { type: String, default: "" },
            //event: [{ type: mongoose.Schema.Types.ObjectId, ref: 'event'}],
            //user: { type: mongoose.Schema.Types.ObjectId, ref: 'user'},
        });

        loc.save(loc)
        .then(newLoc => {
            // this event host was found so continue
            var event = new Event({
                title: title,
                detail: detail,
                ref: ref,
                creatorId: creatorId,
                creatorType: creatorType,
                startDate: startDate,
                endDate: endDate,
                recurring: recurring,
                timeToNextStartDate: timeToNextStartDate,
                timeToNextStartDateType: timeToNextStartDateType,
                paid: paid,
                virtual: virtual,
                virtualPlatform: virtualPlatform,
                virtualLink: virtualLink,
                eventInviteLink: ref,
                user: user._id,
                location: newLoc._id,
            });

            event.save(event)
            .then(newEvent => {
                // change this user to be a host
                user.isHost = true;
               
                // end add user as a customer on stripe
                User.updateOne({_id: user._id}, user)
                .then(da => console.log("user have been upgraded to host"))
                .catch(err => console.log("error occurred upgrading user to host"));

                //update location with eventId
                newLoc.eventId = newEvent._id;
                newLoc.event = newEvent._id;
                Location.updateOne({_id: newLoc._id}, newLoc)
                .then(da => console.log("location have been updated"))
                .catch(err => console.log("error occurred updating location"));

                // event have been created. Send email to users within the event city
                Location.find({city: location.city})
                .populate('user', {password: 0})
                .populate('event')
                .then(locations => {
                   // console.log(locations);
                    let validLocations = [];
                    for (let i = 0; i < locations.length; i++) {
                        console.log(locations[i]);
                        if(locations[i].userId.length > 0){
                            validLocations.push(locations[i]);
                        }                      
                    }
                 
                    console.log(validLocations);

                    // extract user data from the location.
                    // valid locations have been populated. sort out locations with users in the same city as the event
                    let validUserEmails = [];
                    for (let j = 0; j < validLocations.length; j++) {
                        if(validLocations[j].user.city == newEvent.location.city){
                            validUserIds.push(validLocations[i].user.email);
                        }
                        
                    }

                    console.log(validUserEmails);

                    if(validUserEmails.length > 0){
                         // send email to these users
                    var content = "<p>Hi,</p>" +
                                    "<p>A new event was just created on PPLE that might interest</p>";
                    tools.sendEmailToMany(validUserEmails, "New Event on PPLE close to you", content);

                    }                  

                   
                    result.status = "success";
                    result.event = newEvent;
                    result.message = "new event created successfully";
                    return res.status(200).send(result);
                })
            })
            .catch(err => {
                console.log(err);
                result.status = "failed";
                result.message = "error occurred creating event";
                return res.status(500).send(result);
            });  
        })
        .catch(err => {
            console.log(err);
            result.status = "failed";
            result.message = "error occurred saving location";
            return res.status(500).send(result);
        }); 


        
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding this host data";
        return res.status(500).send(result);
    });  



}

exports.createAdminEvent = (req, res) => {
    var result = {};

    var title = req.body.title;
    var detail = req.body.detail;
    var startDate = req.body.startDate;
    var endDate = req.body.endDate;
    var paid = req.body.paid;
    var creatorId = req.body.creatorId;
    var creatorType = req.body.creatorType;
    var recurring = req.body.recurring;
    var timeToNextStartDate = req.body.timeToNextStartDate;
    var timeToNextStartDateType = req.body.timeToNextStartDateType;
    var virtual = req.body.virtual;
    var virtualPlatform = req.body.virtualPlatform;
    var virtualLink = req.body.virtualLink;
    var location = req.body.location;

    if(virtual == null){
        result.status = "failed";
        result.message = "invalid data - is this event virtual or physical. please specify this field";
        return res.status(400).send(result);
    }

    if(virtual == true && (!virtualLink && virtualPlatform)){
        result.status = "failed";
        result.message = "this event is virtual. please specify virtual platform and link to join";
        return res.status(400).send(result);
    }

    if(!location){
        result.status = "failed";
        result.message = "event location is required";
        return res.status(400).send(result);
    }

    if(location && (!location.address || !location.city)){
        result.status = "failed";
        result.message = "event city and address is required";
        return res.status(400).send(result);
    }


    if(!title){
        result.status = "failed";
        result.message = "event title is required";
        return res.status(400).send(result);
    }

    if(paid == null){
        result.status = "failed";
        result.message = "this event must be paid or not paid";
        return res.status(400).send(result);
    }

    if(!creatorId){
        result.status = "failed";
        result.message = "creatorId is required";
        return res.status(400).send(result);
    }

    if(!creatorType){
        result.status = "failed";
        result.message = "creatorType is required";
        return res.status(400).send(result);
    }

    if(!startDate){
        result.status = "failed";
        result.message = "event start date is required";
        return res.status(400).send(result);
    }

    if(recurring == null){
        result.status = "failed";
        result.message = "this event must be recurring or one-time";
        return res.status(400).send(result);
    }

    if(recurring == true && !timeToNextStartDateType){
        result.status = "failed";
        result.message = "this event is recurring. please specify when to scehudlu the next start date.";
        return res.status(400).send(result);
    }

    if(timeToNextStartDateType &&  //hours, days, weeks, months or years
        (timeToNextStartDateType != "hours" || timeToNextStartDateType != "days" || timeToNextStartDateType != "weeks" || timeToNextStartDateType != "months" || timeToNextStartDateType != "years")
        ){
        result.status = "failed";
        result.message = "invalid time to next start date type- this event is recurring. please specify valid next to next start date type. it must be either hours, days, weeks, months or years";
        return res.status(400).send(result);
    }

    if(recurring == true && !timeToNextStartDate){
        result.status = "failed";
        result.message = "invalid time to next start date - this event is recurring. please specify valid next to next start date.";
        return res.status(400).send(result);
    }

    var ref = creatorId.substring(0, 8) + cryptoRandomString({length: 8, type: 'alphanumeric'});

    Admin.findOne({_id: creatorId})
    .then(user => {
        if(!user){
            result.status = "failed";
            result.message = "this admin data was not found";
            return res.status(404).send(result);
        }

        // if recurring prepare next start date
        var newStartDate = "";
        if(recurring == true){
            if(timeToNextStartDateType == "hours"){
                var sD = new Date(startDate);
                sD.setHour(sD.getHours() + timeToNextStartDate);
                newStartDate = sD.toISOString();
            }
        }

        // create location data
        var loc = new Location({
            country: location.country,
            state: location.state,
            city: location.city,
            address: location.address,
            landmark: location.landmark,
            lat: location.lat,
            lon: location.lon,
            //eventId: { type: String, default: "" },
            //event: [{ type: mongoose.Schema.Types.ObjectId, ref: 'event'}],
            //user: { type: mongoose.Schema.Types.ObjectId, ref: 'user'},
        });

        loc.save(loc)
        .then(newLoc => {
            // this event host was found so continue
            var event = new Event({
                title: title,
                detail: detail,
                ref: ref,
                creatorId: creatorId,
                creatorType: creatorType,
                startDate: startDate,
                endDate: endDate,
                recurring: recurring,
                timeToNextStartDate: timeToNextStartDate,
                timeToNextStartDateType: timeToNextStartDateType,
                paid: paid,
                virtual: virtual,
                virtualPlatform: virtualPlatform,
                virtualLink: virtualLink,
                eventInviteLink: ref,
                admin: user._id,
                location: newLoc._id,
            });

            event.save(event)
            .then(newEvent => {
                

                //update location with eventId
                newLoc.eventId = newEvent._id;
                newLoc.event = newEvent._id;
                Location.updateOne({_id: newLoc._id}, newLoc)
                .then(da => console.log("location have been updated"))
                .catch(err => console.log("error occurred updating location"));

                // event have been created. Send email to users within the event city
                Location.find({city: location.city})
                .populate('user', {password: 0})
                .populate('event')
                .then(locations => {
                   // console.log(locations);
                    let validLocations = [];
                    for (let i = 0; i < locations.length; i++) {
                        console.log(locations[i]);
                        if(locations[i].userId.length > 0){
                            validLocations.push(locations[i]);
                        }                      
                    }
                 
                    console.log(validLocations);

                    // extract user data from the location.
                    // valid locations have been populated. sort out locations with users in the same city as the event
                    let validUserEmails = [];
                    for (let j = 0; j < validLocations.length; j++) {
                        if(validLocations[j].user.city == newEvent.location.city){
                            validUserIds.push(validLocations[i].user.email);
                        }
                        
                    }

                    console.log(validUserEmails);

                    if(validUserEmails.length > 0){
                         // send email to these users
                    var content = "<p>Hi,</p>" +
                                    "<p>A new event was just created on PPLE that might interest</p>";
                    tools.sendEmailToMany(validUserEmails, "New Event on PPLE close to you", content);

                    }                  

                   
                    result.status = "success";
                    result.event = newEvent;
                    result.message = "new event created successfully";
                    return res.status(200).send(result);
                })
            })
            .catch(err => {
                console.log(err);
                result.status = "failed";
                result.message = "error occurred creating event";
                return res.status(500).send(result);
            });  
        })
        .catch(err => {
            console.log(err);
            result.status = "failed";
            result.message = "error occurred saving location";
            return res.status(500).send(result);
        });         
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding this host data";
        return res.status(500).send(result);
    });  

}

exports.createEventTicket = (req, res) => {
    var result = {};

    var title = req.body.title;
    var detail = req.body.detail;
    
    var startDate = req.body.startDate;
    var endDate = req.body.endDate;
    var paid = req.body.paid;
    var creatorId = req.body.creatorId;
    var eventId = req.body.eventId;
    var amount = req.body.amount;
    var maxTickets = req.body.maxTickets;

    
    if(!title){
        result.status = "failed";
        result.message = "ticket title is required";
        return res.status(400).send(result);
    }

    if(!eventId){
        result.status = "failed";
        result.message = "event id is required";
        return res.status(400).send(result);
    }

    if(paid == null){
        result.status = "failed";
        result.message = "this ticket must be paid or not paid";
        return res.status(400).send(result);
    }

    if(paid == true && amount == null){
        result.status = "failed";
        result.message = "this ticket is paid, please specify ticket amount";
        return res.status(400).send(result);
    }

    if(paid == true && (amount == 0 || amount < 0) ){
        result.status = "failed";
        result.message = "this ticket is paid, please specify valid ticket amount";
        return res.status(400).send(result);
    }

    if(!creatorId){
        result.status = "failed";
        result.message = "creatorId is required";
        return res.status(400).send(result);
    }

    if(!startDate){
        result.status = "failed";
        result.message = "event start date is required";
        return res.status(400).send(result);
    }    

    var ref = eventId.substring(10) + cryptoRandomString({length: 8, type: 'alphanumeric'});

    Event.findOne({_id: eventId})
    .then(event => {
        if(!event){
            result.status = "failed";
            result.message = "event data not found";
            return res.status(404).send(result); 
        }

        // now create event
        var ticket = new Ticket({
            title: title,
            detail: detail,
            ref: ref,
            creatorId: creatorId,
            eventId: eventId,
            amount: amount,
            startDate: startDate,
            endDate: endDate,
            maxTickets: maxTickets,
            paid: paid,
            event: eventId
        });

        ticket.save(ticket)
        .then(newTicket => {
            // update event with ticket
            event.tickets.push(newTicket._id);
            Event.updateOne({_id: event._id}, event)
            .then(da => console.log("event updated successfully"))
            .catch(err => console.log("error occurred updating event"));

            result.status = "success";
            result.message = "event ticket created successfully";
            result.ticket = newTicket;
            return res.status(200).send(result);
        })
        .catch(err => {
            console.log(err);
            result.status = "failed";
            result.message = "error occurred saving event ticket";
            return res.status(500).send(result);
        });  
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding this event data";
        return res.status(500).send(result);
    });  


}

exports.editEvent = (req, res) => {
    var result = {};

    var title = req.body.title;
    var detail = req.body.detail;
    var startDate = req.body.startDate;
    var endDate = req.body.endDate;
    var recurring = req.body.recurring;
    var timeToNextStartDate = req.body.timeToNextStartDate;
    var timeToNextStartDateType = req.body.timeToNextStartDateType;
    var virtual = req.body.virtual;
    var virtualPlatform = req.body.virtualPlatform;
    var virtualLink = req.body.virtualLink;
    var eventId = req.body.eventId;

    if(!eventId){
        result.status = "failed";
        result.message = "event id is required";
        return res.status(400).send(result);
    }

    if(virtual == null){
        result.status = "failed";
        result.message = "invalid data - is this event virtual or physical. please specify this field";
        return res.status(400).send(result);
    }

    if(virtual == true && (!virtualLink && virtualPlatform)){
        result.status = "failed";
        result.message = "this event is virtual. please specify virtual platform and link to join";
        return res.status(400).send(result);
    }

  
    if(!title){
        result.status = "failed";
        result.message = "event title is required";
        return res.status(400).send(result);
    }



    if(!startDate){
        result.status = "failed";
        result.message = "event start date is required";
        return res.status(400).send(result);
    }

    if(!recurring){
        result.status = "failed";
        result.message = "this event must be recurring or one-time";
        return res.status(400).send(result);
    }

    if(recurring == true && !timeToNextStartDateType){
        result.status = "failed";
        result.message = "this event is recurring. please specify when to scehudlu the next start date.";
        return res.status(400).send(result);
    }

    if(timeToNextStartDateType &&  //hours, days, weeks, months or years
        (timeToNextStartDateType != "hours" || timeToNextStartDateType != "days" || timeToNextStartDateType != "weeks" || timeToNextStartDateType != "months" || timeToNextStartDateType != "years")
        ){
        result.status = "failed";
        result.message = "invalid time to next start date type- this event is recurring. please specify valid next to next start date type. it must be either hours, days, weeks, months or years";
        return res.status(400).send(result);
    }

    if(recurring == true && !timeToNextStartDate){
        result.status = "failed";
        result.message = "invalid time to next start date - this event is recurring. please specify valid next to next start date.";
        return res.status(400).send(result);
    }

    Event.findOne({_id: eventId})
    .then(event => {
        if(!event){
            result.status = "failed";
            result.message = "event data not found";
            return res.status(404).send(result);
        }
      


        // event was found. start updating
        event.title = title;
        event.detail = detail;
        event.startDate = startDate;
        event.endDate = endDate;
        event.recurring = recurring;
        event.timeToNextStartDate = timeToNextStartDate;
        event.timeToNextStartDateType = timeToNextStartDateType;
        event.virtual = virtual;
        event.virtualPlatform = virtualPlatform;
        event.virtualLink = virtualLink;

        Event.updateOne({_id: event._id}, event)
        .then(data => {
            result.status = "success";
            result.message = "event successfully updated";
            return res.status(200).send(result);
        })
        .catch(err => {
            console.log(err);
            result.status = "failed";
            result.message = "error occurred updating event";
            return res.status(500).send(result);
        }); 

    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding this event data";
        return res.status(500).send(result);
    }); 



}

exports.eventsByUser = (req, res) => {
    var result = {};

    var creatorId = req.body.creatorId;
    var page = req.query.page;
    var perPage = 20;

    Event.find({creatorId: creatorId})
    .then(initEvents => {
        Event.find({creatorId: creatorId})
        .skip((perPage * page) - perPage)
        .limit(perPage)
        .populate("user", {password: 0, emailNotif: 0})
        .populate("admin", {password: 0})
        .populate("location")
        .populate("tickets")
        .sort('-createdAt')
        .then(events => {
            result.status = "success";
            result.events = events;
            result.total = initEvents.length;
            result.message = "events found: " + events.length;
            return res.status(200).send(result);
        })
        .catch(err => {
            console.log(err);
            result.status = "failed";
            result.message = "error occurred finding user";
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

exports.eventsByRef = (req, res) => {
    var result = {};

    var ref = req.body.ref;    

    Event.findOne({ref: ref})
    .populate("user", {password: 0, emailNotif: 0})
    .populate("admin", {password: 0})
    .populate("location")
    .populate("tickets")
    .then(event => {
        if(!event){
            result.status = "failed";
            result.message = "event not found"
            return res.status(404).send(result);  
        }
        result.status = "success";
        result.event = event;
        result.message = "event found"
        return res.status(200).send(result);
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding user";
        return res.status(500).send(result);
    });
}

exports.eventsById = (req, res) => {
    var result = {};

    var eventId = req.body.eventId;    

    Event.findone({_id: eventId})
    .populate("user", {password: 0, emailNotif: 0})
    .populate("admin", {password: 0})
    .populate("location")
    .populate("tickets")
    .then(events => {
        result.status = "success";
        result.message = "events found: " + events.length;
        return res.status(200).send(result);
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding events";
        return res.status(500).send(result);
    });
}

exports.searchForEvent = (req, res) => {
    var result = {};

    var query = req.body.query;

    Event.find({$text: {$search: query}, status: true})
    .populate("user", {password: 0, emailNotif: 0})
    .populate("admin", {password: 0})
    .populate("location")
    .populate("ticket")
    .then(events => {
        result.status = "success";
        result.message = "events found: " + events.length;
        return res.status(200).send(result);
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding events";
        return res.status(500).send(result);
    });
}

exports.editEventMedia = (req, res) => {
    var result = {};
   
    let uploadPath;
    var mediaPosition = req.body.mediaPosition;
    var avatar = req.files.avatar; 
    var eventId = req.body.eventId;

    if (!req.files || Object.keys(req.files).length === 0) {
        result.status = "failed";
        result.message = "image fields cannot be empty";
        return res.status(400).send(result);
    }

    Event.findOne({_id: eventId})
    .then(event => {
        if(!event){
            result.status = "failed";
            result.message = "event not found";
            return res.status(404).send(result);
        }

        uploadPath = path.join(process.cwd(), '/media/images/events/' +  avatar.name); //__dirname + '/images/avatars/' + avatar.name;
        console.log(avatar.mimetype);
        console.log(process.cwd()); 

         // Use the mv() method to place the file somewhere on your server
        avatar.mv(uploadPath, function(err) {
            if (err){
                result.status = "failed";
                result.message = "error moving file: " + err;
                return res.status(500).send(result);
            }


            // create filename
            var newName = '';
            if(avatar.mimetype == 'image/jpeg'){
                newName = event.ref + '_' + mediaPosition + '.jpg';
            }else if(avatar.mimetype == 'image/png'){
                newName = event.ref + '_' + mediaPosition + '.png';
            }else if (avatar.mimetype == 'image/gif') {
                newName = event.ref + '_' + mediaPosition + '.gif';
            }else {
                newName = event.ref + '_' + mediaPosition + '.png';
            }
            
            // we need to rename here   
            var newPath = path.join(process.cwd(), '/media/images/events/' + newName);  
            fs.rename(uploadPath, newPath, function(err) {
                if (err) {
                    result.status = "failed";
                    result.message = "image rename not successful: " + err;
                    return res.status(500).send(result);
                }
                console.log("Successfully renamed the event image!: " + newName );

                // update event image field in the required position
                if(mediaPosition == 1){
                    event.mediaPosition1 = "media-events/" + newName;
                }else if(mediaPosition == 2){
                    event.mediaPosition2 = "media-events/" + newName;
                }else if(mediaPosition == 3){
                    event.mediaPosition3 = "media-events/" + newName;
                }else if(mediaPosition == 4){
                    event.mediaPosition4 = "media-events/" + newName;
                }               


                Event.updateOne({_id: event._id}, event)
                .then(data => {
                    result.status = "success";
                    result.message = "event image uploaded successful";
                    return res.status(200).send(result);
                })
                .catch(err => {
                    console.log(err);
                    result.status = "failed";
                    result.message = "error occurred uploading event image";
                    return res.status(500).send(result);
                });
                
            });

        });
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding event";
        return res.status(500).send(result);
    });  
}

exports.buyTicket = async(req, res) => {
    var result = {};

    var email = req.body.email;
    var firstname = req.body.firstname;
    var lastname = req.body.lastname;
    var phone = req.body.phone;
    var eventId = req.body.eventId;
    var userId = req.body.userId;
    var ref = req.body.ref;
    var chargeId = req.body.chargeId; // charge Id from Stripe

    var ticketData = req.body.ticketData;
    /**
     * ticketdata is an array of object containing all that is needed to create child tickets
     * its properties are:
     * ticketId
     * eventId
     * ticketRef
     * eventRef
     * quantity 
     */
    

        
    stripe.charges.retrieve(chargeId) //'ch_1J8u0m2eZvKYlo2C4iRdROE7'
    .then(async(chargeData) => {
        
        //"status": "succeeded",
        if(chargeData.status == "succeeded"){
            //console.log(chargeData);
            // charge was successful, lets create child ticket for user
            var cTickets = [];
            var allGuests = [];
            
            for(var i = 0; i < ticketData.length; i++){
                try{
                    let t = await Ticket.findOne({_id: ticketData[i].ticketId}).exec();
                    console.log(t);
                    if(!t){
                        console.log("this ticket data was not found");
                        result.status = "failed";
                        result.message = "this ticket data was not found so this operation cannot continue. please contact support.";
                        return res.status(404).send(result);
                    }

                    // ticket data was found so create child ticket with the required quantity
                    for (let j = 0; j < ticketData[i].quantity; j++) {
                        var childTicket = new ChildTicket({
                            title: t.title,
                            detail: t.detail,
                            ref: t.ref.substring(10) + cryptoRandomString({length: 5, type: 'alphanumeric'}),
                            creatorId: t.creatorId,
                            eventId: t.eventId,
                            amount: t.amount,
                            startDate: t.startDate,
                            endDate: t.endDate,
                            paid: t.paid,
                            status: true,
                            event: t.eventId,
                            ticket: t._id,
                        });

                        cTickets.push(childTicket);

                        // increase ticket sold quantity
                        t.soldTickets = t.soldTickets + 1;
                        try{
                            let tUpdate = await Ticket.findOne({_id: ticketData[i].ticketId}).exec();
                            console.log("ticket sold quantity updated successfully");
                        }
                        catch(er){
                            console.log(er);
                        }
                        

                    }

                    // save guest
                    var guest = new Guest({
                        firstname: firstname,
                        lastname: lastname,
                        phone: phone,
                        email: email,
                        userId: userId,
                        event: ticketData[i].eventId,
                    });

                    try{
                        let nG = await guest.save(guest);
                        console.log("saved event guest");
                        console.log(nG);
                    }
                    catch(err){
                        console.log(err);
                    }
                    
                    }
                    catch(error){
                        console.log(error);
                    };                   
                                
            }

            for(var i = 0; i < cTickets.length; i++){
                var ct = cTickets[i];
                let nct =  await ct.save(ct);
                console.log(nct);                
            }

            var allGuestEmails = [];
            for(var i = 0; i < allGuests.length; i++){
                var ct = allGuests[i];
                allGuestEmails.push(ct.email);
            }

            //send email to guests who just bought tickets
            //tools.sendEmailToMany(allGuestEmails, "Your Event Ticket", "Your ticket is ready on PPLE");
            
            result.status = "success";
            result.message = "ticket sales was successful";
            result.tickets = cTickets;
            result.guests = allGuests;
            //result.chargeData = chargeData;
            return res.status(200).send(result);
            
        } else{
            result.status = "failed";
            result.message = "invalid charge Id or error occurred";
            return res.status(400).send(result);
        }
    })
    .catch(error => {
        console.error(error.message);
        result.status = "failed";
        result.message = error.message;
        return res.status(500).send(result);
    
    });
}

exports.buyTicketFree = async(req, res) => {
    var result = {};

    var email = req.body.email;
    var firstname = req.body.firstname;
    var lastname = req.body.lastname;
    var phone = req.body.phone;
    var eventId = req.body.eventId;
    var userId = req.body.userId;
    var ref = req.body.ref;

    var ticketData = req.body.ticketData;
    /**
     * ticketdata is an array of object containing all that is needed to create child tickets
     * its properties are:
     * ticketId
     * eventId
     * ticketRef
     * eventRef
     * quantity 
     */
    

    var cTickets = [];
    var allGuests = [];
    var notFoundError = false;
    var paidTicketError = false;
        
    for(var i = 0; i < ticketData.length; i++){
        try{
            let t = await Ticket.findOne({_id: ticketData[i].ticketId}).exec();
            console.log(t);
            if(!t){
                notFoundError = true;
                break;
            }

            
            if(t.paid == true){
                paidTicketError = true;
                break;
            }            

                // ticket data was found so create child ticket with the required quantity
                for (let j = 0; j < ticketData[i].quantity; j++) {
                    var childTicket = new ChildTicket({
                        title: t.title,
                        detail: t.detail,
                        ref: t.ref.substring(10) + cryptoRandomString({length: 5, type: 'alphanumeric'}),
                        creatorId: t.creatorId,
                        eventId: t.eventId,
                        amount: t.amount,
                        startDate: t.startDate,
                        endDate: t.endDate,
                        paid: t.paid,
                        status: true,
                        event: t.eventId,
                        ticket: t._id,
                    });

                    cTickets.push(childTicket);

                    // increase ticket sold quantity
                    t.soldTickets = t.soldTickets + 1;
                    try{
                        let tUpdate = await Ticket.findOne({_id: ticketData[i].ticketId}).exec();
                        console.log("ticket sold quantity updated successfully");
                    }
                    catch(er){
                        console.log(er);
                    }
                    

                }

                // save guest
                var guest = new Guest({
                    firstname: firstname,
                    lastname: lastname,
                    phone: phone,
                    email: email,
                    userId: userId,
                    event: ticketData[i].eventId,
                });

                try{
                    let nG = await guest.save(guest);
                    console.log("saved event guest");
                    console.log(nG);
                }
                catch(err){
                    console.log(err);
                }
                
        }
           catch(error){
            console.log(error);
        };                   
                            
    }

    // there was an error: a ticket here is not free
    if(paidTicketError == true){
        console.log("this ticket is a paid ticket");
        result.status = "failed";
        result.message = "this ticket is not free so this operation cannot continue. please contact support.";
        return res.status(500).send(result);
    }

    if(notFoundError == true){
        console.log("this ticket data was not found");
        result.status = "failed";
        result.message = "this ticket data was not found so this operation cannot continue. please contact support.";
        return res.status(500).send(result);
    }

    for(var i = 0; i < cTickets.length; i++){
        var ct = cTickets[i];
        let nct =  await ct.save(ct);
        console.log(nct);                
    }

        var allGuestEmails = [];
        for(var i = 0; i < allGuests.length; i++){
            var ct = allGuests[i];
            allGuestEmails.push(ct.email);
        }

        //send email to guests who just bought tickets
        //tools.sendEmailToMany(allGuestEmails, "Your Event Ticket", "Your ticket is ready on PPLE");
        
        result.status = "success";
        result.message = "ticket sales was successful";
        result.tickets = cTickets;
        result.guests = allGuests;
        //result.chargeData = chargeData;
        return res.status(200).send(result);
}

exports.allEvents = (req, res) => {
    var result = {};
    var page = req.query.page;  
    var perPage = 20;  

    console.log(page);

    if(!page){
        page = 1;
    }
    console.log(page);

    Event.find()
    .then(initEvents => {
        Event.find()
        .skip((perPage * page) - perPage)
        .limit(perPage)
        .populate("user", {firstname: 1, lastname: 1, email: 1, avatar: 1})
        .populate("admin", {password: 0})
        .populate("location")
        .populate("tickets")
        .sort('-createdAt')
        .limit(5)
        .then(events => {
            result.status = "success";
            result.events = events;
            result.total = initEvents.length;
            result.message = "events found: " + events.length;
            return res.status(200).send(result);
        })
        .catch(err => {
            console.log(err);
            result.status = "failed";
            result.message = "error occurred finding user";
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

exports.upComingEvents = (req, res) => {
    var result = {};
    var page = req.query.page;  
    var perPage = 20;  

    var currentDate = new Date();    
    var useDate = new Date(currentDate);
    useDate.setDate(useDate.getDate() - 21);

    console.log(page);

    if(!page){
        page = 1;
    }
    console.log(page);

    Event.find({startDate: {
        $gte: useDate,
        //$lte: currentDate
    }})
    .then(initEvents => {
        Event.find({startDate: {
            $gte: useDate,
            //$lte: currentDate
        }})
        .skip((perPage * page) - perPage)
        .limit(perPage)
        .populate("user", {firstname: 1, lastname: 1, email: 1, avatar: 1})
        .populate("admin", {password: 0})
        .populate("location")
        .populate("tickets")
        .sort('-createdAt')
        .limit(5)
        .then(events => {
            result.status = "success";
            result.events = events;
            result.total = initEvents.length;
            result.message = "events found: " + events.length;
            return res.status(200).send(result);
        })
        .catch(err => {
            console.log(err);
            result.status = "failed";
            result.message = "error occurred finding user";
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

exports.onGoingEvents = (req, res) => {
    var result = {};
    var page = req.query.page;  
    var perPage = 20;  

    var currentDate = new Date();    
    var useDate = new Date(currentDate);
    useDate.setDate(useDate.getDate() - 21);

    console.log(page);

    if(!page){
        page = 1;
    }
    console.log(page);

    Event.find({
        startDate: {
            //$gte: useDate,
            $lte: currentDate
        },
        endDate: {
            $gte: useDate,
            //$lte: currentDate
        },
        
    })
    .then(initEvents => {
        Event.find({
            startDate: {
                //$gte: useDate,
                $lte: currentDate
            },
            endDate: {
                $gte: useDate,
                //$lte: currentDate
            },
            
        })
        .skip((perPage * page) - perPage)
        .limit(perPage)
        .populate("user", {firstname: 1, lastname: 1, email: 1, avatar: 1})
        .populate("admin", {password: 0})
        .populate("location")
        .populate("tickets")
        .sort('-createdAt')
        .limit(5)
        .then(events => {
            result.status = "success";
            result.events = events;
            result.total = initEvents.length;
            result.message = "events found: " + events.length;
            return res.status(200).send(result);
        })
        .catch(err => {
            console.log(err);
            result.status = "failed";
            result.message = "error occurred finding user";
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

exports.pastEvents = (req, res) => {
    var result = {};
    var page = req.query.page;  
    var perPage = 20;  

    var currentDate = new Date();    
    var useDate = new Date(currentDate);
    useDate.setDate(useDate.getDate() - 21);

    console.log(page);

    if(!page){
        page = 1;
    }
    console.log(page);

    Event.find({endDate: {
        //$gte: useDate,
        $lte: currentDate
    }})
    .then(initEvents => {
        Event.find({endDate: {
            //$gte: useDate,
            $lte: currentDate
        }})
        .skip((perPage * page) - perPage)
        .limit(perPage)
        .populate("user", {firstname: 1, lastname: 1, email: 1, avatar: 1})
        .populate("admin", {password: 0})
        .populate("location")
        .populate("tickets")
        .sort('-createdAt')
        .then(events => {
            result.status = "success";
            result.events = events;
            result.total = initEvents.length;
            result.message = "events found: " + events.length;
            return res.status(200).send(result);
        })
        .catch(err => {
            console.log(err);
            result.status = "failed";
            result.message = "error occurred finding user";
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

