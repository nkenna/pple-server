const db = require("../models");
const User = db.users;
const Event = db.events;
const Like = db.likes;
const Join = db.joins;
const Follow = db.follows;
const Device = db.devices;
const Notification = db.notifications;
var tools = require('../config/utils');
const os = require('os');
var fs = require('fs');




exports.followUser = (req, res) => {
    var result = {};

    var followerId = req.body.followerId;
    var followedId = req.body.followedId;

    Follow.findOne({followerId : followerId, followedId: followedId, status: 'pending'})
    .then(foundFollow => {
        if(foundFollow){
            result.status = "failed";
            result.message = "follow request already sent";
            return res.status(419).send(result); 
        }

        User.findOne({_id: followerId})
        .then(follower => {
            if(!follower){
                result.status = "failed";
                result.message = "user does not exist";
                return res.status(404).send(result); 
            }

            User.findOne({_id: followedId})
            .then(followed => {
                if(!followed){
                    result.status = "failed";
                    result.message = "user to follow does not exist";
                    return res.status(404).send(result); 
                }

                // create followe data
                var follow = new Follow({
                    followerId: follower._id,
                    followedId: followed._id,
                    follower: follower._id,
                    followed: followed._id
                });

                follow.save(follow)
                .then(newFollow => {
                    // create push notification to followed
                    Device.findOne({userId: followed._id})
                    .then(device => {
                        if(device){
                            var data = {
                                "userId": follower._id.toString()
                            };

                            tools.pushMessageToDeviceWithData(
                                device.token,
                                "New Follow",
                                follower.username + " requested to follow you on PPLE",
                                data
                            );
                        }
                    })
                    .catch(err => console.log("error finding followed device"));

                

                    // create notification data for followed
                    var notification = new Notification({
                        type: "follow request", // invite, follow request, follow accept, message, order, refund, payout
                        message: follower.username + " requested to follow you",
                        followId: newFollow._id,
                        follow: newFollow._id,
                        //followerId: {type: String},
                        //follower: { type: mongoose.Schema.Types.ObjectId, ref: 'user'},
                        followedId: followed._id,
                        followered: followed._id,
                        ownerId: followed._id,
                        owner: followed._id,
                    });

                    notification.save(notification)
                    .then(newNotification => console.log("new notification created"))
                    .catch(err => console.log("error creating new notification"));

                    // send response
                    result.status = "success";
                    result.message = "follow request sent successfully";
                    result.followData = newFollow;
                    return res.status(200).send(result); 
                })
                .catch(err => {
                    console.log(err);
                    result.status = "failed";
                    result.message = "error occurred creating follow request";
                    return res.status(500).send(result);
                });
            })
            .catch(err => {
                console.log(err);
                result.status = "failed";
                result.message = "error occurred finding user to follow";
                return res.status(500).send(result);
            });
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
        result.message = "error occurred finding follow request";
        return res.status(500).send(result);
    });

    
}

exports.acceptOrRejectFollow = (req, res) => {
    var result = {};

    var acceptStatus = req.body.acceptStatus;
    var followedId = req.body.followedId;
    var followerId = req.body.followerId;
    var followId = req.body.followId;

    Follow.findOne({_id: followId})
    .then(follow => {
        if(!follow){
            result.status = "failed";
            result.message = "follow request does not exist";
            return res.status(404).send(result); 
        }

        User.findOne({_id: followedId})
        .then(followed => {
            if(!followed){
                result.status = "failed";
                result.message = "fuser to follow does not exist";
                return res.status(404).send(result); 
            }

            User.findOne({_id: followerId})
            .then(follower => {
                if(!follower){
                    result.status = "failed";
                    result.message = "follow request does not exist";
                    return res.status(404).send(result); 
                }


                // update follow data
                follow.status = acceptStatus == true ? 'accepted' : 'rejected';
                // if accept status is true, proceed to update follow data
                // if accept status is false, proceed to delete follow data
                if(acceptStatus == true){
                    Follow.updateOne({_id: follow._id}, follow)
                    .then(data => console.log('follow data updated successfully'))
                    .catch(err => console.log("error updating follow data"));

                    // updated followed user count
                    followed.followersCount = followed.followersCount + 1;
                    User.updateOne({_id: followed._id}, followed)
                    .then(update => {
                        // update follower count
                        follower.followedCount = follower.followedCount + 1;
                        User.updateOne({_id: follower._id}, follower)
                        .catch(err => console.log("error updating follower data"));

                        // send push notification to follower
                        Device.findOne({userId: follower._id})
                        .then(device => {
                            if(device){
                                var data = {
                                    "userId": followed._id.toString()
                                };
                                tools.pushMessageToDeviceWithData(
                                    device.token,
                                    "Follow request accepted",
                                    followed.username + " justed accepted your follow request",
                                    data
                                );
                            }
                        })
                        .catch(err => console.log("error finding follower device"));

                        // create notification data for follower
                        var notification = new Notification({
                            type: "follow accept", // invite, follow request, follow accept, message, order, refund, payout
                            message: followed.username + " justed accepted your follow request",
                            followId: follow._id,
                            follow: follow._id,
                            followerId: follower._id,
                            follower: follower._id,
                            ownerId: follower._id,
                            owner: follower._id,
                            //followedId: followed._id,
                            //followered: followed._id
                        });

                        notification.save(notification)
                        .then(newNotification => console.log("new notification created"))
                        .catch(err => console.log("error creating new notification"));

                    })
                    .catch(err => console.log("error updating user to follow"));
                }else{
                    // send push notification to follower
                    Device.findOne({userId: follower._id})
                    .then(device => {
                        if(device){
                            var data = {
                                "userId": followed._id.toString()
                            };
                            tools.pushMessageToDeviceWithData(
                                device.token,
                                "Follow request rejected",
                                followed.username + " just rejected your follow request",
                                data
                            );
                        }
                    })
                    .catch(err => console.log("error finding follower device"));

                    // create notification data for follower
                    var notification = new Notification({
                        type: "follow reject", // invite, follow request, follow accept, follow reject, message, order, refund, payout
                        message: followed.username + " justed rejected your follow request",
                        followId: follow._id,
                        follow: follow._id,
                        followerId: follower._id,
                        follower: follower._id,
                        ownerId: follower._id,
                        owner: follower._id,
                        //followedId: followed._id,
                        //followered: followed._id
                    });

                    notification.save(notification)
                    .then(newNotification => console.log("new notification created"))
                    .catch(err => console.log("error creating new notification"));

                    Follow.deleteOne({_id: follow._id})
                    .then(data => {
                        console.log('follow data deleted successfully');

                    })
                    .catch(err => console.log("error deleting follow data"));
                }

                // send response
                result.status = "success";
                result.message = acceptStatus == true ? "follow request accepted successfully" : "follow request declined successfully";
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
            result.message = "error occurred finding user to follow";
            return res.status(500).send(result);
        });
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding follow data";
        return res.status(500).send(result);
    });
}

exports.unfollowUser = (req, res) => {
    var result = {};

    var followerId = req.body.followerId;
    var followedId = req.body.followedId;

    User.findOne({_id: followedId})
    .then(followed => {
        if(!followed){
            result.status = "failed";
            result.message = "user to follow does not exist";
            return res.status(404).send(result); 
        }

        User.findOne({_id: followerId})
        .then(follower => {
            if(!follower){
                result.status = "failed";
                result.message = "user does not exist";
                return res.status(404).send(result); 
            }

            Follow.findOne({followerId : followerId, followedId: followedId})
            .then(follow => {
                if(!follow){
                    result.status = "failed";
                    result.message = "follow data does not exist";
                    return res.status(404).send(result); 
                }

                // delete follow data
                Follow.deleteOne({_id: follow._id})
                .then(deletedData => {
                    // update follower count
                    follower.followedCount = follower.followedCount - 1;
                    User.updateOne({_id: follower._id}, follower)
                    .catch(err => console.log("error updating follower data"));

                    followed.followersCount = followed.followersCount - 1;
                    User.updateOne({_id: followed._id}, followed)
                    .catch(err => console.log("error updating followed data"));

                    result.status = "success";
                    result.message = "user unfollowed successfully";
                    return res.status(200).send(result);
                })
                .catch(err => {
                    console.log(err);
                    result.status = "failed";
                    result.message = "error occurred funfollowing user";
                    return res.status(500).send(result);
                });
            })
            .catch(err => {
                console.log(err);
                result.status = "failed";
                result.message = "error occurred finding follow data";
                return res.status(500).send(result);
            });
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
        result.message = "error occurred finding user to follow";
        return res.status(500).send(result);
    });
}
