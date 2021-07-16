const db = require("../models");
const User = db.users;
const ResetCode = db.resetcodes;
const Admin = db.admins;
const Event = db.events;
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


exports.adminAllUsers = (req, res) => {
    var result = {};
    var perPage = 10;
    var page = req.query.page;

    console.log(page);

    if(!page){
        page = 1;
    }
    console.log(page);

    User.find()
    .then(initUsers => {
        User.find()
        .select("-password")
        .skip((perPage * page) - perPage)
        .limit(perPage)
        .populate('events')
        .sort('-createdAt')
        .then(users => {
            result.status = "success";
            result.message = "users found: " + users.length;
            result.total = initUsers.length;
            result.users = users;
            return res.status(200).send(result);
        })
        .catch(err => {
            console.log(err);
            result.status = "failed";
            result.message = "error occurred finding users";
            return res.status(500).send(result);
        });
    })
    
    
    
}

exports.flagUnflagUser = (req, res) => {
	var result = {};
	var username = req.body.username;
	var status = req.body.status;
	
	User.findOne({username: username})
	.then(user => {
		if(!user){
			result.status = "failed";
			result.message = "user data not found";
			return res.status(404).send(result);
		}
		
		console.log(user);
		
		user.status = status;
		
		//update user data
		User.updateOne({username: user.username}, user)
		.then(resb => {
			console.log(resb);
			result.status = "success";
			result.message = "user status updated successfully";
			return res.status(200).send(result);
		})
		.catch(err => {
			console.log(err);
			result.status = "failed";
			result.message = "error occurred updating user";
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

exports.createAdmin = (req, res) => {
    var result = {};

    var email = req.body.email;
    var name = req.body.name;
    var phone =  req.body.phone;
    var role = req.body.role;

    if(!email){
        result.status = "failed";
        result.message = "admin email is required";
        return res.status(400).send(result);
    }    

    if(!name){
        result.status = "failed";
        result.message = "admin name is required";
        return res.status(400).send(result);
    }

    if(!role){
        result.status = "failed";
        result.message = "admin role is required";
        return res.status(400).send(result);
    }

    Admin.findOne({email: email})
    .then(admin => {
        if(admin){
            result.status = "failed";
            result.message = "admin with this email already exist";
            return res.status(400).send(result);
        }

        // admin does not exist, create this account
        bcrypt.hash(cryptoRandomString({length: 12, type: 'alphanumeric'}), saltRounds, (err, hash) => {
            if(err){
                result.status = "failed";
                result.message = "unknown error occurred - password hash failed";
                return res.status(500).send(result);
            }

            var newAdmin = Admin({
                password: hash,
                name: name,
                role: role,
                phone: phone,
                email: email
            });

            newAdmin.save(newAdmin)
            .then(savedAdmin => {
                var emailtext = "<p>Dear " + newAdmin.name +"</p>" +
                                "<p>A new admin account have been created for you at PPLE Admin portal. Reset your password there to continue</p>" +
                                "<p> Thanks, PPLE Team.</p>";
                
                tools.sendEmail(
                    newAdmin.email,
                    "Your PPLE admin Account",
                    emailtext
                );
                result.status = "success";
                result.message = "admin successful created";
                result.admin = savedAdmin;
                return res.status(200).send(result); 
            })
            .catch(err => {
                console.log(err);
                result.status = "failed";
                result.message = "error occurred saving admin";
                return res.status(500).send(result);
            });
        })
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding admin";
        return res.status(500).send(result);
    });
}

exports.initAdminChangePassword = (req, res) => {
    var result = {};

    var email = req.body.email;

    if(!email){
        result.status = "failed";
        result.message = "admin email is required";
        return res.status(400).send(result);
    }   

    Admin.findOne({email: email})
    .then(admin => {
        if(!admin){
            result.status = "failed";
            result.message = "this admin is not attached to any account";
            return res.status(404).send(result);
        }

        var code = cryptoRandomString({length: 32, type: 'alphanumeric'})

        // save code
        var rcode = new ResetCode({
            code: code,
            email: email
        });

        rcode.save(rcode)
        .then(rc => {
            console.log("done creating verification code");
            var emailtext = "<p>You requested to reset your password. If you did not make this request, please contact support and change your password. If not, use this code to reset your password: " +
            rc.code + "</p>";
            
            tools.sendEmail(
                admin.email,
                "Reset Account password",
                emailtext
            );

            result.status = "success";
            result.message = "admin reset password email sent";
            return res.status(200).send(result);
        })
        .catch(err => console.log("error sending email"));      
       
    });
}

exports.resetAdminPassword = (req, res) => {
    var result = {};

    var code = req.body.code;
    var password = req.body.password;

   ResetCode.findOne({code: code})
   .then(rcode => {
    if(!rcode){
        result.status = "failed";
        result.message = "invalid reset code recieved";
        return res.status(400).send(result);
    }

    Admin.findOne({email: rcode.email})
    .then(user => {
        if(!user){
            result.status = "failed";
            result.message = "no admin account found";
            return res.status(404).send(result);
        }

        bcrypt.hash(password, saltRounds, (err, hashed) => {
            if(err){
                result.status = "failed";
                result.message = "unknown error occurred - password hash failed";
                return res.status(500).send(result);
            }

            user.password = hashed;
            Admin.updateOne({email: user.email}, user)
            .then(data => {
                result.status = "success";
                result.message = "password reset was successful. Procees to login";
                return res.status(200).send(result);
            })
            .catch(err => {
                console.log(err);
                result.status = "failed";
                result.message = "error occurred resetting password";
                return res.status(500).send(result);
            });

        });
    }).catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding admin";
        return res.status(500).send(result);
    });


   })
   .catch(err => {
    console.log(err);
    result.status = "failed";
    result.message = "error occurred finding code";
    return res.status(500).send(result);
});
}

exports.allAdmins = (req, res) => {
    var result = {};

    
    Admin.find()
    .select("-password")
    .then(admins => {
        result.status = "success";
        result.message = "users found";
        result.admins = admins;
        return res.status(200).send(result);
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding users";
        return res.status(500).send(result);
    });
}

exports.adminLogin = (req, res) => {
    var result = {};

    var email = req.body.email;
    var password = req.body.password;

    Admin.findOne({email: email})
    .then(user => {
        if(!user){
            result.status = "failed";
            result.message = "account does not exist";
            return res.status(404).send(result); 
        }

        // match user password since user exist
        bcrypt.compare(password, user.password, (err, resx) => {
            // if res == true, password matched
            // else wrong password
            if(resx == false){
                result.status = "failed";
                result.message = "wrong account credentials";
                return res.status(401).send(result);
            }


            if(user.verified == false){
                result.status = "failed";
                result.message = "unverified account";
                return res.status(403).send(result);
            }

            if(user.status == false){
                result.status = "failed";
                result.message = "flagged account";
                return res.status(403).send(result);
            }

            // everything seems alright, generate token
            var data = {
                role: user.role,
                email: user.email
            }
            const token = tools.generateAdminAccessToken(data);

            var userData = {
                role: user.role,
                email: user.email,
                name: user.name,
                id: user._id
            }

            result.admin = userData;
            result.token = token;
            result.status = "success";
            result.message = "authenication success";
            return res.status(200).send(result);
        });
    
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding user";
        return res.status(500).send(result);
    });
}

exports.adminSearchUsers = (req, res) => {
    var result = {};
    var query = req.body.query;

    User.find({$text: {$search: query}})
    .select("-password")
    .populate('events')
    
    .sort('-createdAt')
    .then(users => {
        result.status = "success";
        result.message = "users found: " + users.length;
        result.users = users;
        return res.status(200).send(result);
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding users";
        return res.status(500).send(result);
    });
}

exports.changeAdminRole = (req, res) => {
    var result = {};

    var adminEmail = req.body.adminEmail;
    var role = req.body.role;

    if(adminEmail == null || role == null){
        result.status = "failed";
        result.message = "admin email and role are required";
        return res.status(400).send(result);
    }

    Admin.findOne({email: adminEmail})
    .then(admin => {
        if(!admin){
            result.status = "failed";
            result.message = "admin not found";
            return res.status(404).send(result);
        }

        admin.role = role;
        Admin.updateOne({email: admin.email}, admin)
        .then(pocc => {
            console.log("admin saved");
            result.status = "success";
            result.message = "admin role updated";
            return res.status(200).send(result);
        })
        .catch(err => {
            console.log(err);
            result.status = "failed";
            result.message = "error occurred updating admin";
            return res.status(500).send(result);
        });

    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding admin";
        return res.status(500).send(result);
    });
}

exports.allEventsDashboard = (req, res) => {
    var result = {};    

    Event.find()
    .populate("user", {firstname: 1, lastname: 1, email: 1, avatar: 1})
    .populate("admin", {password: 0})
    //.populate("location")
    //.populate("tickets")
    .sort('-createdAt')
    .limit(5)
    .then(events => {
        result.status = "success";
        result.events = events;
        result.message = "events found: " + events.length;
        return res.status(200).send(result);
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding user";
        return res.status(500).send(result);
    });
}

exports.allEvents = (req, res) => {
    var result = {};
    var page = req.query.page;  
    var perPage = 10;  

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

exports.dashboardData = (req, res) => {
    var result = {};
    var currentDate = new Date();    
    var pastDate = new Date(currentDate);
    pastDate.setDate(pastDate.getDate() - 30);

    console.log(pastDate.toISOString());
    

    Event.find({createdAt: {
        $gte: pastDate,
        $lte: currentDate
    }})
    .then(events => {
        result.status = "success";
        result.message = "data found";
        result.events = events.length;
        return res.status(200).send(result);
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding events";
        return res.status(500).send(result);
    });

    
}

