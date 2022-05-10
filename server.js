#!/usr/bin/env nodejs

const express = require("express");
const bodyParser = require('body-parser');
const formidable = require('formidable');
const cors = require("cors");
const fileUpload = require('express-fileupload');
const db = require("./models");
const os = require('os');
var fs = require('fs');
const path = require("path");
require('dotenv').config();
const app = express();

app.use(cors());
app.options('*', cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload({
  useTempFiles : true,
  debug: true
}));

// production
var filesFolderAvatar = path.join(process.cwd(), 'media/images/avatars');
var filesFolderEvents = path.join(process.cwd(), 'media/images/events');

// test
//var filesFolderAvatar = path.join(process.cwd(), 'test/media/images/avatars');
//var filesFolderEvents = path.join(process.cwd(), 'test/media/images/events');

console.log(filesFolderAvatar);
console.log(filesFolderEvents);


//app.use('/static', express.static(path.join(__dirname, 'public')))

// production
app.use('/media-avatar', express.static(filesFolderAvatar));
app.use('/media-events', express.static(filesFolderEvents));

//test
//app.use('/test/media-avatar', express.static(filesFolderAvatar));
//app.use('/test/media-events', express.static(filesFolderEvents));

db.mongoose
  .connect(db.url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  
  .then(() => {
    console.log("Connected to the database!");
  })
  .catch(err => {
    console.log("Cannot connect to the database!", err);
    process.exit();
  });

  require("./routes/user.routes")(app);
  require("./routes/event.routes")(app);
  require("./routes/admin.routes")(app);
  require("./routes/host.routes")(app);
  require("./routes/invite.routes")(app);
  require("./routes/order.routes")(app);
  require("./routes/chat.routes")(app);

  
  //require("./app/routes/admin.routes")(app);

  app.get("/", (req, res) => {
    res.send("hello apache men");
});

// test
//const PORT = process.env.PORT_TEST || 8585; // test server port 8585...prod server port is 8182

// production
const PORT = process.env.PORT_PROD || 8182;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}.`);
});