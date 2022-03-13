const db = require("../models");
const User = db.users;
const Wallet = db.wallets;
const VerifyCode = db.verifycodes;
const ResetCode = db.resetcodes;

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

exports.createUser = (req, res) => {
    var result = {};

    var firstname = req.body.firstname;
    var lastname = req.body.lastname;
    var phone = req.body.phone;
    var email = req.body.email;
    var password = req.body.password;
    //var username = req.body.username;

    
    
    if(!email){
        result.status = "failed";
        result.message = "email is required";
        return res.status(400).send(result);
    }

    if(!username){
        result.status = "failed";
        result.message = "username is required";
        return res.status(400).send(result);
    }

    if(!password){
        result.status = "failed";
        result.message = "password is required";
        return res.status(400).send(result);
    }

    if(password.length < 8){
        result.status = "failed";
        result.message = "password length must be equal to or greater than 8 characters.";
        return res.status(400).send(result);
    }

    User.findOne({username: {$regex: username, $options: 'i'}})
    .then(userWithUsername => {
        if(userWithUsername){
            result.status = "failed";
            result.message = "username already taken. Try another one";
            return res.status(409).send(result); 
        }

        User.findOne({ email: {$regex : email, $options: 'i'}})
        .then(userd => {
            if(userd){
                result.status = "failed";
                result.message = "email already exist. Try another email or login with this account";
                return res.status(409).send(result); 
            }

            bcrypt.hash(password, saltRounds, (err, hash) => {
                // Now we can store the password hash in db.
                if(err){
                    result.status = "failed";
                    result.message = "unknown error occurred with password";
                    return res.status(500).send(result);
                }
        
                var newUser = new User({
                    firstname: firstname,
                    lastname: lastname,
                    phone: phone,
                    email: email,
                    password: hash,
                    username: username
                });

                    
                newUser.save(newUser)
                .then(user => {
                    // create user wallet
                    var wallet = new Wallet({
                        walletRef: cryptoRandomString({length: 6, type: 'alphanumeric'}) + cryptoRandomString({length: 6, type: 'alphanumeric'}),
                        userId: user._id,
                        user: user._id
                    });

                    wallet.save(wallet)
                    .then(wa => {
                        console.log("user wallet created");
                        user.wallet = wa._id;
                        User.updateOne({_id: user._id}, user)
                        .then(wa => console.log("user updated"))
                        .catch(err => console.log("error updating user"));

                    })
                    .catch(err => console.log("error creating wallet"));
                    
                    // creating stripe customer
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
                            .catch(err => console.log("error occurred updating user"));
                        }else{
                            result.status = "failed";
                            result.message = "stripe operation failed";
                            return res.status(400).send(result);
                        }
                        
                    })
                    .catch(err => console.log("error creating strip customer: " + err));

                
                        
                    // send verification email
                    var vcode = new VerifyCode({
                        code: cryptoRandomString({length: 6, type: 'alphanumeric'}),
                        email: user.email,
                        userId: user._id
                    });
        
                    vcode.save(vcode)
                    .then(vc => {
                        console.log("done creating verification code");
                    
                        var emailtext = "<p>To verify your account. Click on this link or copy to your browser: " +
                        "https://pple.com/verify-account/" + vc.code + " or paste this code on the provided field: "+ vc.code + " </p>";

                        tools.sendEmail(
                            user.email,
                            "New PPLE Account Verification",
                            emailtext
                        );
                    })
                    .catch(err => console.log("error sending email: " + err));
        
                    
                    result.status = "success";
                    result.message = "user account created successfully";
                    return res.status(200).send(result);
                });
            });
        })
        .catch(err => {
            console.log(err);
            result.status = "failed";
            result.message = "error occurred finding this email";
            return res.status(500).send(result);
        });  
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding this username";
        return res.status(500).send(result);
    });  

      
}

exports.startEnable2FAOnUser = (req, res) => {
    var result = {};

    var userId = req.body.userId;
    var phone = req.body.phone;

    if(!phone){
        result.status = "failed";
        result.message = "phone is required";
        return res.status(400).send(result);
    }

    if(!userId){
        result.status = "failed";
        result.message = "userId is required";
        return res.status(400).send(result);
    }


}

exports.addUsernameToUser = (req, res) => {
    var result = {};

    var userId = req.body.userId;
    var username = req.body.username;

    if(!username){
        result.status = "failed";
        result.message = "username is required";
        return res.status(400).send(result);
    }

    User.findOne({username: {$regex: username, $options: 'i'}})
    .then(exists => {
        if(exists){
            result.status = "failed";
            result.message = "username already taken. Try another one";
            return res.status(409).send(result); 
        }

        User.findOne({_id: userId})
        .then(user => {
            if(!user){
                result.status = "failed";
                result.message = "user does not exist";
                return res.status(404).send(result); 
            }

            //update user's username
            user.username = username;
            User.updateOne({_id: user._id}, user)
            .then(data => {
                result.status = "success";
                result.message = "username successfully added";
                return res.status(200).send(result); 
            })
            .catch(err => {
                console.log(err);
                result.status = "failed";
                result.message = "error occurred creating username";
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
        result.message = "error occurred finding this username";
        return res.status(500).send(result);
    });

}

exports.verifyUser = (req, res) => {
    var result = {};

    var code = req.body.code;

    if(!code){
        result.status = "failed";
        result.message = "invalid verification code - empty code";
        return res.status(400).send(result);
    }

    VerifyCode.findOne({code: code})
    .then(vc => {
        if(!vc){
            result.status = "failed";
            result.message = "invalid verification code - code not found";
            return res.status(404).send(result);
        }

        //find user
        User.findOne({_id: vc.userId})
        .then(user => {
            if(!user){
                result.status = "failed";
                result.message = "user not found";
                return res.status(404).send(result);
            }

            user.verified = true;
            User.updateOne({_id: user._id}, user)
            .then(vidd => console.log("done"))
            .catch(err => console.log("error updating user"));

            // delete verification code data
            VerifyCode.deleteOne({code: vc.code})
            .then(vidd => console.log("done deleting"))
            .catch(err => console.log("error verification code data"));

            var emailtext = "<p>Dear, " + user.firstname + "</p>" +
                            "You are indeed welcome to PPLE." +
                            "<p>Thanks, Dakowa Team</p>"
                    
            tools.sendEmail(
                user.email,
                "PPLE welcomes you",
                emailtext
            );

            var userData = {
                id: user._id,
                email: user.email,
                avatar: user.avatar,
                firstname: user.firstname,
                lastname: user.lastname
            }

         

            result.status = "success";
            result.user = userData;
            result.message = "user verified successfully";
            return res.status(200).send(result);
        })
        .catch(err => {
            console.log(err);
            result.status = "failed";
            result.message = "error occurred finding user for verification";
            return res.status(500).send(result);
        });
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred verifying user";
        return res.status(500).send(result);
    });
}

exports.resendVerification = (req, res) => {
    var result = {};
    var email = req.body.email;

    if(!email){
        result.status = "failed";
        result.message = "email is required";
        return res.status(400).send(result);
    }

    User.findOne({email: email})
    .then(user => {
        if(!user){
            result.status = "failed";
            result.message = "user not found";
            return res.status(404).send(result);
        }

        // user was found. get the verification code
        VerifyCode.findOne({userId: user._id})
        .then(vc => {
            if(!vc){
                result.status = "failed";
                result.message = "user verification code not found";
                return res.status(404).send(result);
            }


            // send verification code in mail
            var emailtext = "To verify your account. Click on this link or copy to your browser: " +
                "https://pple.com/verify-account/" + vc.code ;

                    
                    
            tools.sendEmail(
                user.email,
                "New Account Verification",
                emailtext
            );

            result.status = "success";
            result.message = "user verification email sent";
            return res.status(200).send(result);
        });
    });
}

exports.loginUser = (req, res) => {
    var result = {};
    
    var email = req.body.email;
    var password = req.body.password;

    User.findOne({email: email})
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
                return res.status(423).send(result);
            }

            if(user.status == false){
                result.status = "failed";
                result.message = "flagged account";
                return res.status(403).send(result);
            }

            // everything seems alright, generate token
            var data = {
                emai: user.email,
                userId: user._id
            }
            const token = tools.generateAccessToken(data);

            var userData = {
                firstname: user.firstname,
                lastname: user.lastname,
                email: user.email,
                name: user.name,
                id: user._id,
                avatar: user.avatar,
            }

            result.user = userData;
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

exports.changePassword = (req, res) => {
    var result = {};

    var currentPassword = req.body.currentPassword;
    var newPassword = req.body.newPassword;
    var userId = req.body.userId;

    if(!newPassword){
        result.status = "failed";
        result.message = "password is required";
        return res.status(400).send(result);
    }

    if(newPassword.length < 8){
        result.status = "failed";
        result.message = "password length must be equal to or greater than 8 characters.";
        return res.status(400).send(result);
    }

    User.findOne({_id: userId})
    .then(user => {
        if(!user){
            result.status = "failed";
            result.message = "account does not exist";
            return res.status(404).send(result); 
        }

        bcrypt.compare(currentPassword, user.password, (err, resx) => {
            if(err){
                result.status = "failed";
                result.message = "error occurred changing password";
                return res.status(500).send(result);
            }

            if(resx == false){
                result.status = "failed";
                result.message = "wrong current password supplied";
                return res.status(401).send(result);
            }

            // change password
            bcrypt.hash(newPassword, saltRounds, (errx, hash) => {
                if(errx){
                    result.status = "failed";
                    result.message = "error occurred changing password";
                    return res.status(500).send(result);
                }

                user.password = hash;
                User.updateOne({username: user.username}, user)
                .then(updateData => {
                    result.status = "success";
                    result.message = "user updated successfully";
                    return res.status(200).send(result);
                })
                .catch(err => {
                    console.log(err);
                    result.status = "failed";
                    result.message = "error occurred during operation";
                    return res.status(500).send(result);
                });

            })
        })
       
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding user";
        return res.status(500).send(result);
    });
}

exports.sendResetEmail = (req, res) => {
    var result = {};
    var email = req.body.email;

    if(!email){
        result.status = "failed";
        result.message = "email is required";
        return res.status(400).send(result);
    }

    User.findOne({email: email})
    .then(user => {
        if(!user){
            result.status = "failed";
            result.message = "this email is not attached to any account";
            return res.status(404).send(result);
        }

        var code = cryptoRandomString({length: 32, type: 'alphanumeric'})

        // save code
        var rcode = new ResetCode({
            code: code,
            username: user.username,
            userId: user._id
        });

        rcode.save(rcode)
        .then(rc => {
            console.log("done creating verification code");
            var emailtext = "<p>You requested to reset your password. If you did not make this request, please contact support and change your password. If not, copy and paste this code on the required field: " +
            rc.code + "</p>" +
            "<p>PPLE Team</p>";
            
            tools.sendEmail(
                user.email,
                "Reset Account password",
                emailtext
            );

            result.status = "success";
            result.message = "user reset password email sent";
            return res.status(200).send(result);
        })
        .catch(err => {
            console.log(err);
            result.status = "failed";
            result.message = "error occurred saving reset code data";
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

exports.resetPassword = (req, res) => {
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

    User.findOne({_id: rcode.userId})
    .then(user => {
        if(!user){
            result.status = "failed";
            result.message = "no user account found";
            return res.status(404).send(result);
        }

        bcrypt.hash(password, saltRounds, (err, hashed) => {
            if(err){
                result.status = "failed";
                result.message = "unknown error occurred - password hash failed";
                return res.status(500).send(result);
            }

            user.password = hashed;
            User.updateOne({_id: user._id}, user)
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
        result.message = "error occurred finding user";
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

exports.userProfileByEmail = (req, res) => {
    var result = {};

    var email = req.body.email;

    User.findOne({email: email})
    .select("-password")
    .populate("events")
    .then(user => {
        if(!user){
            result.status = "failed";
            result.message = "no user account found";
            return res.status(404).send(result);
        }

        result.status = "success";
        result.message = "user account found";
        result.user = user;
        return res.status(200).send(result);

    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding user";
        return res.status(500).send(result);
    });
}

exports.userProfileById = (req, res) => {
    var result = {};

    var userId = req.body.userId;

    User.findOne({_id: userId})
    .select("-password")
    .populate("events")
    .then(user => {
        if(!user){
            result.status = "failed";
            result.message = "no user account found";
            return res.status(404).send(result);
        }

        result.status = "success";
        result.message = "user account found";
        result.user = user;
        return res.status(200).send(result);

    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding user";
        return res.status(500).send(result);
    });
}

exports.editProfile = (req, res) => {
    var result = {};
   
    var firstname = req.body.firstname;
    var lastname = req.body.lastname;
    var phone = req.body.phone;
    //var hostTip = req.body.hostTip;
    var bio = req.body.bio;
    var userId = req.body.userId;
   


    User.findOne({_id: userId})
    .then(user => {
        if(!user){
            result.status = "failed";
            result.message = "user account does not exist";
            return res.status(404).send(result); 
        }

        user.firstname = firstname;
        user.lastname = lastname;
        user.phone = phone;
        //user.hostTip = hostTip;
        user.bio = bio;
        
        User.updateOne({_id: user._id}, user)
        .then(update => {
            result.status = "success";
            result.message = "user data updated successfully";
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

exports.editAvatar = (req, res) => {
    var result = {};

   
    let uploadPath;
    var userId = req.body.userid;
    var avatar = req.files.avatar;    

    if (!req.files || Object.keys(req.files).length === 0) {
        result.status = "failed";
        result.message = "image fields cannot be empty";
        return res.status(400).send(result);
    }


    User.findOne({_id: userId})
    .then(user => {
        if(!user){
            result.status = "failed";
            result.message = "user not found";
            return res.status(404).send(result);
        }

        uploadPath = path.join(process.cwd(), '/media/images/avatars/' +  avatar.name); //__dirname + '/images/avatars/' + avatar.name;
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
                newName = user._id + '_' + 'avatar' + '.jpg';
            }else if(avatar.mimetype == 'image/png'){
                newName = user._id + '_' + 'avatar' + '.png';
            }else if (avatar.mimetype == 'image/gif') {
                newName = user._id + '_' + 'avatar' + '.gif';
            }else {
                newName = user._id + '_' + 'avatar' + '.png';
            }
            
            // we need to rename here   
            var newPath = path.join(process.cwd(), '/media/images/avatars/' + newName);  
            fs.rename(uploadPath, newPath, function(err) {
                if (err) {
                    result.status = "failed";
                    result.message = "avatar upload not successful: " + err;
                    return res.status(500).send(result);
                }
                console.log("Successfully renamed the avatar!");

                // update user avatar field
                user.avatar = "/media-avatar/" + newName;
                User.updateOne({username: user.username}, user)
                .then(data => {
                    result.status = "success";
                    result.message = "avatar uploaded successful";
                    return res.status(200).send(result);
                })
                .catch(err => {
                    console.log(err);
                    result.status = "failed";
                    result.message = "error occurred uploading avatar";
                    return res.status(500).send(result);
                });
                
            });

        });
    })
    .catch(err => {
        console.log(err);
        result.status = "failed";
        result.message = "error occurred finding user";
        return res.status(500).send(result);
    });  
}

exports.addCustomerCard = (req, res) => {
    var result = {};

    var userId = req.body.userId;
    var cardNumber = req.body.cardNumber;
    var expiryMonth = req.body.expiryMonth;
    var expiryYear = req.body.expiryYear;
    var cardCVV = req.body.cardCVV; // must be string


    if(!cardNumber){
        result.status = "failed";
        result.message = "card number field is required";
        return res.status(400).send(result); 
    }

    if(!cardCVV){
        result.status = "failed";
        result.message = "card cvv field is required";
        return res.status(400).send(result); 
    }

    if(!expiryMonth){
        result.status = "failed";
        result.message = "card expiry month field is required";
        return res.status(400).send(result); 
    }

    if(!expiryYear){
        result.status = "failed";
        result.message = "card expiry year field is required";
        return res.status(400).send(result); 
    }

    User.findOne({_id: userId})
    .then(user => {
        if(!user){
            result.status = "failed";
            result.message = "user not foud";
            return res.status(404).send(result); 
        }

        stripe.tokens.create({
            card: {
                number: cardNumber,
                exp_month: expiryMonth,
                exp_year: expiryYear,
                cvc: cardCVV
            }
        })
        .then(tokenData => {
            
        })
    })
}


