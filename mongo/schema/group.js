module.exports = {
	created_time: { type: Date, default: Date.now},
	description: { type: String },
	id: { type: String },
	groupname: { type: String, required: true },
	owners: { type: Array },
	updated_time: { type: Date, default: Date.now},
	users: { type: Array }
};