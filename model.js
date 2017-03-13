var	mongoose = require('mongoose'),
	moment = require('moment');
/**
 * Configuration.
 */

var	clientModel = require('./mongo/model/client'),
	tokenModel = require('./mongo/model/token'),
	userModel = require('./mongo/model/user'),
	readingModel = require('./mongo/model/reading'),
	groupModel = require('./mongo/model/group'),
	practiceModel = require('./mongo/model/practice');

/**
 * Add example client and user to the database (for debug).
 */
 
var loadExampleClient = function() {
	
	var client = new clientModel({
		clientId: 'application',
		clientSecret: 'secret'
	});
	
	client.save(function(err, client) {

		if (err) {
			return console.error(err);
		}
		console.log('Created client', client);
	});
}

/**
 * Dump the database content (for debug).
 */

var dump = function() {

	clientModel.find(function(err, clients) {

		if (err) {
			return console.error(err);
		}
		console.log('clients', clients);
	});

	tokenModel.find(function(err, tokens) {

		if (err) {
			return console.error(err);
		}
		console.log('tokens', tokens);
	});

	userModel.find(function(err, users) {

		if (err) {
			return console.error(err);
		}
		console.log('users', users);
	});
	
	readingModel.find(function(err, readings) {

		if (err) {
			return console.error(err);
		}
		console.log('readings', readings);
	});
	
	groupModel.find(function(err, groups) {

		if (err) {
			return console.error(err);
		}
		console.log('groups', groups);
	});
	
	practiceModel.find(function(err, practices) {

		if (err) {
			return console.error(err);
		}
		console.log('practices', practices);
	});
};

/*
 * Get access token.
 */

var getAccessToken = function(bearerToken, callback) {

	tokenModel.findOne({
		accessToken: bearerToken
	}, callback);
};

/**
 * Get client.
 */

var getClient = function(clientId, clientSecret, callback) {

	clientModel.findOne({
		clientId: clientId,
		clientSecret: clientSecret
	}, callback);
};

/**
 * Grant type allowed.
 */

var grantTypeAllowed = function(clientId, grantType, callback) {

	callback(false, grantType === "password");
};

/**
 * Save token.
 */

var saveAccessToken = function(accessToken, clientId, expires, user, callback) {

	var token = new tokenModel({
		accessToken: accessToken,
		expires: expires,
		clientId: clientId,
		user: user
	});

	token.save(callback);
};

/**
 * Get user.
 */

var getUser = function(username, password, callback) {

	userModel.findOne({
		username: username,
		password: password,
	}, callback);
};

/**
 * Export model definition object.
 */

module.exports = {
	getAccessToken: getAccessToken,
	getClient: getClient,
	grantTypeAllowed: grantTypeAllowed,
	saveAccessToken: saveAccessToken,
	getUser: getUser
};

//loadExampleClient();