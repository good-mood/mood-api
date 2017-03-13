module.exports = {
	created_time: { type: Date, default: Date.now },
	email: { type: String },
	first_name: { type: String },
	last_name: { type: String },
	id: { type: String },
	updated_time: { type: Date, default: Date.now },
	username: { type: String, required: true },
	password: { type: String, required: true },
	admin: { type: Boolean, default: false}
};