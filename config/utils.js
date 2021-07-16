const https = require('https');
const fs = require("fs");
const path = require('path');
const axios = require("axios").default;
const sgMail = require('@sendgrid/mail');
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
const key = crypto.randomBytes(32); '43925b7e3f593b56f3b9605a8bd8059ae82ea7280f8f63251f69c88df02cd812'
//const secretKey = 'vOVH6sdmpNWjRRIqCc7rdxs01lwHzfr3';
const iv = crypto.randomBytes(16);

// get config vars
dotenv.config();


module.exports = {


sendEmail: async(reciever, subject, text) => {
    
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);

        const msg = {
        to: reciever, // Change to your recipient
        from: "hello@dakowa.com", // Change to your verified sender
        subject: subject,
        //text: text,
        html: text,
        }

        sgMail
        .send(msg)
        .then(() => {
            console.log('Email sent')
        })
        .catch((error) => {
            console.error(error)
        })

},

sendEmailToMany: async(recievers, subject, text) => {
    
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
    to: recievers, // Change to your recipient
    from: "hello@dakowa.com", // Change to your verified sender
    subject: subject,
    //text: text,
    html: text,
    }

    sgMail
    .sendMultiple(msg)
    .then(() => {
        console.log('Email sent')
    })
    .catch((error) => {
        console.error(error)
    })

},


sendEmailWithAttachment: async(reciever, subject, text, attachment) => {
    
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
        to: reciever, // Change to your recipient
        from: "hello@dakowa.com", // Change to your verified sender
        subject: subject,
        //text: text,
        html: text,
        attachments: [
            {
              content: attachment,
              filename: "attachment.xlsx",
              type: "application/xlsx",
              disposition: "attachment"
            }
        ]
    }

    sgMail
    .send(msg)
    .then(() => {
        console.log('Email sent')
    })
    .catch((error) => {
        console.error(error)
    })

},


authenticateToken: (req, res, next) => {
    var result = {};

    // Gather the jwt access token from the request header
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    
    if (token == null){
        result.status = "failed";
        result.message = "resource access denied - empty token";
        return res.status(401).send(result);
    } //return res.sendStatus(401) // if there isn't any token
      
        jwt.verify(token, process.env.TOKEN_SECRET, (err, authData) => {
          console.log(err)
          if (err){
            result.status = "failed";
            result.message = "resource access denied - invalid token";
            return res.status(403).send(result);
        }
          req.authData = authData
          next() // pass the execution off to whatever request the client intended
        })
},

authenticateSuperAdminToken: (req, res, next) => {
    var result = {};

    // Gather the jwt access token from the request header
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    
    if (token == null){
        result.status = "failed";
        result.message = "resource access denied - empty token";
        return res.status(401).send(result);
    } //return res.sendStatus(401) // if there isn't any token
      
        jwt.verify(token, process.env.TOKEN_SECRET, (err, authData) => {
          console.log(err)
          if (err){
            result.status = "failed";
            result.message = "resource access denied - invalid token";
            return res.status(403).send(result);
        }
        var url = req.path;
        console.log(url);
        if(url == "/all-users"){ // meant for all admins

        }else if(url == "/flag-user"){// meant for all admins
            
        }else if(url == "/all-supporters"){

        }else if(url == "/all-supports"){ // meant for all admins

        }else if(url == "/all-goals"){ // meant for all admins

        }else if(url == "/all-pocket-trans"){ // meant for all admins

        }else if(url == "/all-admins"){ // meant for all admins

        }else if(url == "/all-payouts"){ // meant for all admins

        }else if(url == "/admin-check-transfer"){ // meant for all admins

        }else if(url == "/admin-transfer-fees"){ // meant for all admins

        }else if(url == "/admin-change-role"){ // only for super admin
            if(authData.role != "super admin"){
                result.status = "failed";
                result.message = "resource access denied - unauthorized";
                return res.status(401).send(result);
            }
        }else if(url == "/admin-update-payout"){ // meant for super admin and admin
            if(authData.role != "super admin" && authData.role != "admin"){
                result.status = "failed";
                result.message = "resource access denied - unauthorized";
                return res.status(401).send(result);
            }
        }else if(url == "/admin-search-user"){ // meant for all admins

        }else if(url == "/admin-dashboard"){ // meant for all admins

        }else if(url == "/create-admins"){ // only super admin
            if(authData.role != "super admin"){
                result.status = "failed";
                result.message = "resource access denied - unauthorized";
                return res.status(401).send(result);
            }
        }else if(url == "/admin-start-payout"){ // only super admin
            if(authData.role != "super admin"){
                result.status = "failed";
                result.message = "resource access denied - unauthorized";
                return res.status(401).send(result);
            }
        }
        

          req.authData = authData
          next() // pass the execution off to whatever request the client intended
        })
},


generateAccessToken: (username) => {
     return jwt.sign(username, process.env.TOKEN_SECRET, { expiresIn: '72000s' });
},

generateAdminAccessToken: (data) => {
    return jwt.sign(data, process.env.TOKEN_SECRET, { expiresIn: '72000s' });
},


pushMessageToDevice: (deviceToken, title, body) => {

    var admin = require("firebase-admin");

    var serviceAccount = require("./dakowa-de6e0-firebase-adminsdk.json");

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
     }
    var payload = {
        notification: {
          title: title,
          body: body
        }
      };
      
       var options = {
        priority: "high",
        timeToLive: 60 * 60 *24
      };

      admin.messaging().sendToDevice(deviceToken, payload, options)
        .then(function(response) {
            console.log("Successfully sent message:", response);
        })
        .catch(function(error) {
            console.log("Error sending message:", error);
        });

},

pushMessageToTopic: (topic, title, body) => {

    var admin = require("firebase-admin");

    var serviceAccount = require("./dakowa-de6e0-firebase-adminsdk.json");

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
     }

    var payload = {
        notification: {
          title: title,
          body: body
        }
      };      
       var options = {
        priority: "high",
        timeToLive: 60 * 60 *24
      };

      admin.messaging().sendToTopic(topic, payload, options)
        .then(function(response) {
            console.log("Successfully sent message:", response);
        })
        .catch(function(error) {
            console.log("Error sending message:", error);
        });

}

   
}