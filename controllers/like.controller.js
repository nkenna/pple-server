const db = require("../models");
const User = db.users;
const Event = db.events;
const Like = db.likes;
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
                result.status = "success";
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
    var likeId = req.body.likeId;
   

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
            
            Like.deleteOne({_id: likeId})
            .then(data => {
                console.log(data);
                result.status = "success";
                result.data = data;
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

    var userId = req.body.userId;

    Like.find({userId: userId})
    .populate("event")
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