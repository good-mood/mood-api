var	mongoose = require('mongoose'),
	modelName = 'group',
	schemaDefinition = require('../schema/' + modelName),
	schemaInstance = mongoose.Schema(schemaDefinition),
	modelInstance = mongoose.model(modelName, schemaInstance);
	moment = require('moment');

var Group = module.exports = modelInstance;

var options = {
	safe: true,
	w: 'majority'
};

module.exports.createGroup = function(callback, group) {
	group.id = new mongoose.mongo.ObjectID();
	group.created_time = moment.now();
	Group.create(group, callback);
};

module.exports.findGroups = function(callback, criteria) {
	Group.find(criteria, callback);
};

module.exports.findGroup = function(callback, id) {
	Group.findOne({id: id}, callback);
};

module.exports.updateGroup = function(callback, id, group) {
	//Delete non-updatable fields from the request
	delete group.created_time;
	delete group.id;
	delete group.updated_time;
	delete group.__v;
	delete group._id;
	group.updated_time = moment.now();
	Group.findOneAndUpdate({id: id}, group, options, callback);
};

module.exports.removeGroup = function(callback, id) {
	Group.findOneAndRemove({id: id}, options, callback);
};