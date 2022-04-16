const mongoose = require('mongoose')
mongoose.Promise = global.Promise
let MONGO_URL
const config = require('../utils/config').config;
const option = {
	useCreateIndex: true,
	useNewUrlParser: true
};
mongoose.set('useFindAndModify', false);
mongoose.connect(config.dbUrl, option)

// should mongoose.connection be put in the call back of mongoose.connect???
const db = mongoose.connection
db.on('error', err => {
	console.log(`There was an error connecting to the database: ${err}`)
});
db.once('open', () => {
	console.log(
		`You have successfully connected to your mongo database: ${config.dbUrl}`
	)
});
// When the connection is disconnected
db.on('disconnected', function () {  
	console.log('Mongoose default connection disconnected');
	// todo: either retry (if required) or exit(1)
  });
  
  // If the Node process ends, close the Mongoose connection 
process.on('SIGINT', function() {  
	mongoose.connection.close(function () { 
	  console.log('Mongoose default connection disconnected through app termination'); 
	  process.exit(0); 
	}); 
});
module.exports = db