var mongoose = require('mongoose'),
	modelName = 'token',
	schemaDefinition = require('../schema/' + modelName);

var schemaInstance = mongoose.Schema(schemaDefinition);
schemaInstance.index({ "expires": 1 }, { expireAfterSeconds: 0 });

var modelInstance = mongoose.model(modelName, schemaInstance);

var Token = module.exports = modelInstance;

module.exports.findToken = function(callback, token) {
	Token.findOne({accessToken: token}, callback);
};