var	mongoose = require('mongoose'),
	modelName = 'practice',
	schemaDefinition = require('../schema/' + modelName),
	schemaInstance = mongoose.Schema(schemaDefinition),
	modelInstance = mongoose.model(modelName, schemaInstance);

var Practice = module.exports = modelInstance;

module.exports.createPractice = function(callback, id, practices) {
	if (!practices instanceof Array) {
		practices.id = id;
	} else {
		for (var item in practices) {
			practices[item].id = id;
		}
	}
	Practice.create(practices, callback);
};

module.exports.findPractices = function(callback, criteria) {
	Practice.find(criteria, callback);
};