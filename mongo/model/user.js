var	mongoose = require('mongoose'),
	modelName = 'user',
	schemaDefinition = require('../schema/' + modelName),
	schemaInstance = mongoose.Schema(schemaDefinition),
	modelInstance = mongoose.model(modelName, schemaInstance);
	moment = require('moment');

var User = module.exports = modelInstance;

module.exports.createUser = function(callback, user) {
	user.id = new mongoose.mongo.ObjectID();
	user.created_time = moment.now();
	User.create(user, callback);
};

module.exports.findUsers = function(callback, criteria) {
	User.find(criteria, callback);
};

module.exports.findUser = function(callback, id) {
	User.findOne({id: id}, callback);
};

module.exports.findUserByUsername = function(callback, username) {
	User.findOne({username: username}, callback);
};

module.exports.updateUser = function(callback, id, user) {
	//Delete non-updatable fields from the request
	delete user.created_time;
	delete user.id;
	delete user.updated_time;
	delete user.__v;
	delete user._id;
	user.updated_time = moment.now();
	User.findOneAndUpdate({id: id}, user, callback);
};

module.exports.removeUser = function(callback, id) {
	User.findOneAndRemove({id: id}, callback);
};

//For debug

var loadExampleUser = function() {

	var user = new User({
		id: new mongoose.mongo.ObjectID(),
		created_time: moment.now(),
		username: 'vladi',
		password: 'salasana',
	});

	user.save(function(err, user) {

		if (err) {
			return console.error(err);
		}
		console.log('Created user', user);
	});
};

loadExampleUser();