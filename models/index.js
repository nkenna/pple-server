const dbConfig = require('../config/db.config');
const mongoose = require('mongoose');

const db = {};
db.url = dbConfig.url;
db.mongoose = mongoose;
db.users = require('./user.model')(mongoose);
db.events = require('./event.model')(mongoose);
db.likes = require('./like.model')(mongoose);
db.joins = require('./join.model')(mongoose);
db.locations = require('./location.model')(mongoose);
db.tickets = require('./ticket.model')(mongoose);
db.childtickets = require('./childticket.model')(mongoose);
db.guests = require('./guest.model')(mongoose);
db.verifycodes = require('./verifycode.model')(mongoose);
db.resetcodes = require('./resetcode.model')(mongoose);
db.banks = require('./bank.model')(mongoose);
db.connectaccounts = require('./connectaccount.model')(mongoose);
db.wallets = require('./wallet.model')(mongoose);
db.tipdatas = require('./tipdata.model')(mongoose);
db.wallettrans = require('./wallettrans.model')(mongoose);
db.payouttrans = require('./payouttrans.model')(mongoose);

db.admins = require('./admin.model')(mongoose);


module.exports = db;