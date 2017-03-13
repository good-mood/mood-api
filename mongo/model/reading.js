var mongoose = require('mongoose'),
	modelName = 'reading',
	schemaDefinition = require('../schema/' + modelName),
	schemaInstance = mongoose.Schema(schemaDefinition),
	modelInstance = mongoose.model(modelName, schemaInstance);

var Reading = module.exports = modelInstance;

module.exports.createReadings = function (callback, id, readings) {
	if (!readings instanceof Array) {
		readings.id = id;
	} else {
		for (var item in readings) {
			readings[item].id = id;
		}
	}
	Reading.create(readings, callback);
};

module.exports.findReadings = function(callback, criteria) {
	Reading.find(criteria, callback);
};

//For debug

var loadExampleReading = function() {

	var reading = new readingModel({
		id: '124',
		device_id: '11:12:13:14:15:16',
		ring_id: '01:23:45:67:89:AB',
		scrn: 6,
		mm: 45,
		scl: 7,
		steps: 33,
		aa: 153,
		time:  moment.now()
	});

	reading.save(function(err, reading) {

		if (err) {
			return console.error(err);
		}
		console.log('Created reading', reading);
	});
};

//loadExampleReading();