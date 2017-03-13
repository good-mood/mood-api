module.exports = {
	id: { type: String, required: true },
	device_id: { type: String },
	ring_id: { type: String },
	created_time: { type: Date },
	start_time: { type: Date, required: true },
	lenght: { type: Number, required: true },
	mm_avg: { type: Number, required: true }
};