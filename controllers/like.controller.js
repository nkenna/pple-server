const db = require("../models");
const User = db.users;
const Event = db.events;
const Like = db.likes;
const Join = db.joins;
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

exports.LikeEvent = (req, res) => {
    var result = {};

    var userId = req.body.userId;
    var eventId = req.body.eventId;

    User.findOne({_id: userId})
    .then(user => {
        if(!user){
            result.status = "failed";
            result.message = "user not found";
            return res.status(404).send(result);
        }

        Event.findOne({_id: eventId})
        .then(event => {
            if(!event){
                result.status = "failed";
                result.message = "event not found";
                
                return res.status(404).send(result);
            }

            // create new like data
            var like = new Like({
                eventId: event._id,
                userId: user._id,
                event: event._id,
                user: user._id
            });

            like.save(like)
            .then(data => {
                // update event
                event.likesCount = event.likesCount + 1;
                Event.updateOne({_id: event._id}, event)
                .then(dd => console.log('event updated'))
                .catch(err => console.log('error occured updating event likes count'));

                result.status = "success";
                result.liked = true;
                result.message = "event like successful";
                return res.status(200).send(result);
            })
            .catch(err => {
                console.log(err);
                result.status = "failed";
                result.message = "error occurred liking event";
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

exports.UnLikeEvent = (req, res) => {
    var result = {};

    var userId = req.body.userId;
    var eventId = req.body.eventId;
    
   

    User.findOne({_id: userId})
    .then(user => {
        if(!user){
            result.status = "failed";
            result.message = "user not found";
            return res.status(404).send(result);
        }

        Event.findOne({_id: eventId})
        .then(event => {
            if(!event){
                result.status = "failed";
                result.message = "event not found";
                return res.status(404).send(result);
            }

            Like.findOne({eventId: event._id, userId: user._id})
            .then(like => {
                if(!like){
                    result.status = "failed";
                    result.message = "like data not found";
                    return res.status(404).send(result);
                }

                Like.deleteOne({_id: like._id})
                .then(data => {
                    console.log(data);
                    // update event
                    event.likesCount = event.likesCount - 1;
                    Event.updateOne({_id: event._id}, event)
                    .then(dd => console.log('event updated'))
                    .catch(err => console.log('error occured updating event likes count'));

                    result.status = "success";
                    result.liked = false;
                    result.message = "event unliked successful";
                    return res.status(200).send(result);
                })
                .catch(err => {
                    console.log(err);
                    result.status = "failed";
                    result.message = "error occurred unliking event";
                    return res.status(500).send(result);
                });
            })
            .catch(err => {
                console.log(err);
                result.status = "failed";
                result.message = "error occurred finding like data";
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

exports.userLikedEvents = (req, res) => {
    var result = {};

    var userId = req.query.userId;

    Like.find({userId: userId})
    .populate({ 
        path: 'event',
        populate: {
          path: 'location',
          model: 'location',
        },
        
     })
    .then(likes => {
        result.status = "success";
        result.likedEvents = likes;
        result.message = "liked events found: " + likes.length;
        return res.status(200).send(result);
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding user";
        return res.status(500).send(result);
    });
}

