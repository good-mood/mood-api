module.exports = {
	id: { type: String, required: true },
	device_id: { type: String },
	ring_id: { type: String },
	scrn: { type: Number },
	mm: { type: Number },
	scl: { type: Number },
	steps: { type: Number },
	aa: { type: Number },
	time: { type: Date, required: true }
};