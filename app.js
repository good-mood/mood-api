//------------------------------------------------------------------------------
// Mood API
//------------------------------------------------------------------------------

var express = require('express'),
	bodyParser = require('body-parser'),
	oauthserver = require('oauth2-server'),
	mongoose = require('mongoose'),
	moment = require('moment'),
	cfenv = require('cfenv');

var	clientModel = require('./mongo/model/client'),
	tokenModel = require('./mongo/model/token'),
	userModel = require('./mongo/model/user'),
	readingModel = require('./mongo/model/reading'),
	groupModel = require('./mongo/model/group'),
	practiceModel = require('./mongo/model/practice');

var	app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const util = require('util');
const assert = require('assert');

var MongoClient = require('mongodb').MongoClient;
var appenv = cfenv.getAppEnv();
var services = appenv.services;
var mongodb_services = services["compose-for-mongodb"];
assert(!util.isUndefined(mongodb_services), "Must be bound to compose-for-mongodb services");
var credentials = mongodb_services[0].credentials;
var ca = [new Buffer(credentials.ca_certificate_base64, 'base64')];
var mongodb;


MongoClient.connect("mongodb://admin:UFAPABGBLZRJXKKA@sl-us-dal-9-portal.5.dblayer.com:21245", {
		mongos: {
			ssl: true,
			sslValidate: true,
			sslCA: ca,
			poolSize: 1,
			reconnectTries: 1
		}
	},
	function(err, db) {
		if (err) {
			console.log(err);
		} else {
			mongodb = db.db("examples");
		}
	}
);


var mongoDbOptions = {
	mongos: {
		ssl: true,
		sslValidate: true,
		sslCA: ca,
		poolSize: 1,
		reconnectTries: 1,
	}
};

var mongooseClient = mongoose.connect("mongodb://admin:UFAPABGBLZRJXKKA@sl-us-dal-9-portal.5.dblayer.com:21245", mongoDbOptions);

app.oauth = oauthserver({
	model: require('./model.js'),
	grants: ['password'],
	debug: true
});

//Default responses
var	res_200 = {success: true, message: 'OK.'},
	res_201 = {success: true, message: 'Created.'},
	res_204 = {success: true, message: 'No Content.'},
	res_400 = {success: false, message: 'Bad Request. The request could not be understood or was missing required parameters.'},
	res_401 = {success: false, message: 'Unauthorized. Authentication failed or user dost not have permissions for the requested operation.'},
	res_403 = {success: false, message: 'Forbidden. Access denied.'},
	res_404 = {success: false, message: 'Not Found. Resource was not found'},
	res_405 = {success: false, message: 'Method Not Allowed. Requested method is not suppoted for the specified resource.'},
	res_429 = {success: false, message: 'Too Many Requests. Exceeded API limits.'},
	res_500 = {success: false, message: 'Internal Server Error.'};

function invalidRequest(res) {
	res.status(405).send(res_405);
}

function authoriseUser(req, res, API) {
	
	var token = req.headers['authorization'].slice(7);
	var req_id = req.params.id;
	
	//Check ID from token
	tokenModel.findToken(function(err, token){
		if (err) {
			res.status(500).send(res_500);
			return console.error('Error: ' + err);
		}
		if (!token) {
			res.status(401).send(res_401);
		} else {
			
			//Check user ID/admin from user
			if (req_id == undefined) {req_id = token.user.id};
			
			userModel.findUser(function(err, user){
				if (err) {
					res.status(500).send(res_500);
					return console.error('Error: ' + err);
				}
				if (!user) {
					res.status(404).send({success: false, message: 'Not Found. UserID not found'});
				} else {
					
					//Incoming API request is handled only in the following cases
					//1. Requested data is users own data
					//2. User is admin
					//3. Group data request
					
					if (req_id == token.user.id || user.admin || req.path.indexOf('groups') > -1) {
						
						//Find a group by owner ID
						var lookup = {};
						lookup.owners = token.user.id;
						
						groupModel.findGroups(function(err, groups){
							if (err) {
								res.status(500).send(res_500);
								return console.error('Error: ' + err);
							}
							//Handle the API request
							console.log('Request ' + req.path + ' by: ' + user.username + ' admin: ' + user.admin);
							API(req, res, user.id, user.admin, groups);
						}, lookup);
					} else {
						res.status(403).send(res_403);
					}
				}
			}, token.user.id);
		}
	}, token);
};

function createCriteria(id, params, query) {
	if (query) {criteria = query} else {var criteria = {}};
	if (params.start || params.end) {criteria.time = {}};
	if (id) {criteria.id = id};
	if (params.start) {criteria.time.$gte = params.start};
	if (params.end) {criteria.time.$lte = params.end};
	console.log('GET criteria: ' + JSON.stringify(criteria));
	return criteria;
};

app.all('/api/tokens', app.oauth.grant());

app.get('/api/users', app.oauth.authorise(), function (req, res) {
	authoriseUser(req, res, function (req, res, id, admin) {
		if (!admin) {
			if (req.path.slice(-1) == '/') {res.redirect(id);
			} else {res.redirect('users/' + id)};
		} else {
			userModel.findUsers(function(err, users){
				if(err){
					res.status(500).send({success: false, message: 'Internal Server Error. Failed to retrieve users'});
					return console.error('Error: ' + err);
				}
				res.status(200).json({success: true, message: users});
			}, createCriteria(null, req.params, req.query));
		}
	});
});

app.post('/api/users', app.oauth.authorise(), function (req, res) {
	authoriseUser(req, res, function (req, res, id, admin) {
		if (!admin) {
			res.status(403).send(res_403);
		} else {
			if (req.body.username) {
				userModel.findUserByUsername(function(err, user) {
					if(err){
						res.status(500).send({success: false, message: 'Internal Server Error. Failed to create user.'});
						return console.error('Error: ' + err);
					}
					if (!user) {
						userModel.createUser(function(err, user) {
							if (err) {
								if (err.errors.password) {
							{}		res.status(400).send({success: false, message: 'Bad Request. Password is required.'});
									return console.error('Error: ' + err);
								} else {
									if (err.errors.username) {
										res.status(400).send({success: false, message: 'Bad Request. Username is required.'});
										return console.error('Error: ' + err);
									} else {
										res.status(500).send({success: false, message: 'Internal Server Error. Failed to create user.'});
										return console.error('Error: ' + err);
									}
								}
								return console.error('Error: ' + err);
							}
								res.status(201).json({success: true, message: 'User ' + user.username + ' created', id: user.id});
						}, req.body);
					} else {
						res.status(400).send({success: false, message: 'Bad Request. Username already taken.'});
					}
				}, req.body.username);
			} else {
				res.status(400).send({success: false, message: 'Bad Request. Username is required.'});
			}
		}
	});
});

app.put('/api/users', app.oauth.authorise(), function (req, res) {
	invalidRequest(res);
});

app.delete('/api/users', app.oauth.authorise(), function (req, res) {
	invalidRequest(res);
});

app.get('/api/users/:id', app.oauth.authorise(), function (req, res) {
	authoriseUser(req, res, function (req, res, id, admin) {
		userModel.findUser(function (err, user){
			if (err) {
				res.status(500).send(res_500);
				return console.error('Error: ' + err);
			}
			if (!user) {
				res.status(404).send({success: false, message: 'Not Found. UserID not found.'});
			} else {
				res.status(200).json({success: true, message: user});
			}
		}, req.params.id);
	});
});

app.post('/api/users/:id', app.oauth.authorise(), function (req, res) {
	invalidRequest(res);
});

app.put('/api/users/:id', app.oauth.authorise(), function (req, res) {
	authoriseUser(req, res, function (req, res, id, admin) {
		if (req.body.username && !admin) {
			res.status(403).send(res_403);
		} else {
			userModel.findUserByUsername(function(err, user) {
				if(err){
					res.status(500).send({success: false, message: 'Internal Server Error. Failed to update user.'});
					return console.error('Error: ' + err);
				}
				if (!user) {
					userModel.updateUser(function(err, user) {
						if (err) {
							res.status(500).send({success: false, message: 'Internal Server Error. Failed to update user.'});
							return console.error('Error: ' + err);
						}
						if (!user) {
							res.status(404).send({success: false, message: 'UserID not found.'});
						} else {
							userModel.findUser(function(err, user){
								if (err) {
									res.status(500).send(res_500);
									return console.error('Error: ' + err);
								}
								if (!user) {
									res.status(404).send({success: false, message: 'Not Found. UserID not found'});
								} else {
									res.status(201).json({success: true, message: 'User ' + user.username + ' updated.', user: user});
								}
							}, user.id);
						}
					}, req.params.id, req.body);
				} else {
					res.status(400).send({success: false, message: 'Bad Request. Username already taken.'});
				}
			}, req.body.username);
		}
	});
});

app.delete('/api/users/:id', app.oauth.authorise(), function (req, res) {
	authoriseUser(req, res, function (req, res, id, admin) {
		userModel.removeUser(function(err, user) {
			if (err) {
				res.status(500).send({success: false, message: 'Delete failed.'});
				return console.error('Error: ' + err);
			}
			if (!user) {
				res.status(500).send({success: false, message: 'Internal Server Error. UserID not found.'});
			} else {
				res.status(204).send({success: true, message: 'User ' + user.username + ' deleted.'});
			}
		}, req.params.id);
	});
});

app.get('/api/users/:id/readings', app.oauth.authorise(), function (req, res) {
	authoriseUser(req, res, function (req, res, id, admin) {
		readingModel.findReadings(function(err, readings){
			if (err) {
				res.status(500).send({success: false, message: 'Internal Server Error. Failed to retrieve readings.'});
				return console.error('Error: ' + err);
			}
			res.status(200).json({success: true, message: readings});
		}, createCriteria(req.params.id, req.params, req.query));
	});
});

app.post('/api/users/:id/readings', app.oauth.authorise(), function (req, res) {
	authoriseUser(req, res, function (req, res, id, admin) {
		readingModel.createReadings(function(err, readings){
			if(err){
				res.status(500).send({success: false, message: 'Internal Server Error. Failed to post readings.'});
				return console.error('Error: ' + err);
			}
			res.status(201).json({success: true, message: readings});
		}, req.params.id, req.body);
	});
});

app.put('/api/users/:id/readings', app.oauth.authorise(), function (req, res) {
	invalidRequest(res);
});

app.delete('/api/users/:id/readings', app.oauth.authorise(), function (req, res) {
	invalidRequest(res);
});

app.get('/api/users/:id/readings/:start*?,:end*?', app.oauth.authorise(), function (req, res) {
	authoriseUser(req, res, function (req, res, id, admin) {
		readingModel.findReadings(function(err, readings){
			if (err) {
				res.status(500).send({success: false, message: 'Internal Server Error. Failed to retrieve readings.'});
				return console.error('Error: ' + err);
			}
			res.status(200).json({success: true, message: readings});
		}, createCriteria(req.params.id, req.params, req.query));
	});
});

app.post('/api/users/:id/readings/:start,:end', app.oauth.authorise(), function (req, res) {
	invalidRequest(res);
});

app.put('/api/users/:id/readings/:start,:end', app.oauth.authorise(), function (req, res) {
	invalidRequest(res);
});

app.delete('/api/users/:id/readings/:start,:end', app.oauth.authorise(), function (req, res) {
	invalidRequest(res);
});

app.get('/api/users/:id/practices', app.oauth.authorise(), function (req, res) {
	authoriseUser(req, res, function (req, res, id, admin) {
		practiceModel.findPractices(function(err, practices){
			if(err){
				res.status(500).send({success: false, message: 'Internal Server Error. Failed to retrieve practices.'});
				return console.error('Error: ' + err);
			}
			res.status(200).json({success: true, message: practices});
		}, createCriteria(req.params.id, req.params, req.query));
	});
});

app.post('/api/users/:id/practices', app.oauth.authorise(), function (req, res) {
	authoriseUser(req, res, function (req, res, id, admin) {
		practiceModel.createPractice(function(err, practices) {
			if (err) {
				res.status(500).send({success: false, message: 'Internal Server Error. Failed to post readings.'});
				return console.error('Error: ' + err);
			}
			res.status(201).json({success: true, message: practices})
		}, req.params.id, req.body);
	});
});

app.put('/api/users/:id/practices', app.oauth.authorise(), function (req, res) {
	invalidRequest(res);
});

app.delete('/api/users/:id/practices', app.oauth.authorise(), function (req, res) {
	invalidRequest(res);
});

app.get('/api/users/:id/practices/:start*?,:end*?', app.oauth.authorise(), function (req, res) {
	authoriseUser(req, res, function (req, res, id, admin) {
		practiceModel.findPractices(function(err, practices){
			if(err){
				res.status(500).send({success: false, message: 'Internal Server Error. Failed to retrieve practices.'});
				return console.error('Error: ' + err);
			}
			res.status(200).json({success: true, message: practices});
		}, createCriteria(req.params.id, req.params, req.query));
	});
});

app.post('/api/users/:id/practices/:start,:end', app.oauth.authorise(), function (req, res) {
	invalidRequest(res);
});

app.put('/api/users/:id/practices/:start,:end', app.oauth.authorise(), function (req, res) {
	invalidRequest(res);
});

app.delete('/api/users/:id/practices/:start,:end', app.oauth.authorise(), function (req, res) {
	invalidRequest(res);
});

app.get('/api/groups', app.oauth.authorise(), function (req, res) {
	authoriseUser(req, res, function (req, res, id, admin, groups) {
		if (!admin) {
			req.query.owners = id;
		}
		groupModel.findGroups(function(err, groups){
			if(err){
				res.status(500).send({success: false, message: 'Internal Server Error. Failed to retrieve groups.'});
				return console.error('Error: ' + err);
			}
			res.status(200).json({success: true, message: groups});
		}, createCriteria(null, req.params, req.query));
	});
});

app.post('/api/groups', app.oauth.authorise(), function (req, res) {
	authoriseUser(req, res, function (req, res, id, admin) {
		if (!admin) {
			res.status(403).send(res_403);
		} else {
			groupModel.createGroup(function(err, group) {
				if (err) {
					res.status(400).send({success: false, message: 'Bad Request. Group name already taken.'});
					return console.error('Error: ' + err);
				}
				res.status(201).json({success: true, message: 'Group ' + group.groupname + ' created', id: group.id});
			}, req.body);
		}
	});
});

app.put('/api/groups', app.oauth.authorise(), function (req, res) {
	invalidRequest(res);
});

app.delete('/api/groups', app.oauth.authorise(), function (req, res) {
	invalidRequest(res);
});

app.get('/api/groups/:id', app.oauth.authorise(), function (req, res) {
	authoriseUser(req, res, function (req, res, id, admin, groups) {
		var isOwner = groups.filter(function(group) {
			return group.id == req.params.id;
		});
		if (isOwner.length > 0 || admin) {
			groupModel.findGroup(function(err, group){
				if (err) {
					res.status(500).send(res_500);
					return console.error('Error: ' + err);
				}
				if (!group) {
					res.status(404).send({success: false, message: 'Not Found. GroupID not found.'});
				} else {
					res.status(200).json({success: true, message: group});
				}
			}, req.params.id);
		} else {
			res.status(403).send(res_403);
		}
	});	
});

app.post('/api/groups/:id', app.oauth.authorise(), function (req, res) {
	invalidRequest(res);
});

app.put('/api/groups/:id', app.oauth.authorise(), function (req, res) {
	authoriseUser(req, res, function (req, res, id, admin) {
		if (!admin) {
			res.status(403).send(res_403);
		} else {
			groupModel.updateGroup(function(err, group) {
				if (err) {
					res.status(500).send({success: false, message: 'Internal Server Error. Failed to update group.'});
					return console.error('Error: ' + err);
				}
				if (!group) {
					res.status(404).send({success: false, message: 'Not Found. GroupID not found.'});
				} else {
					groupModel.findGroup(function(err, group){
						if (err) {
							res.status(500).send(res_500);
							return console.error('Error: ' + err);
						}
						if (!group) {
							res.status(404).send({success: false, message: 'Not Found. GroupID not found.'});
						} else {
							res.status(201).json({success: true, message: 'Group ' + group.groupname + ' updated.', group: group});
						}
					}, group.id);
				}
			}, req.params.id, req.body);
		}
	});
});

app.delete('/api/groups/:id', app.oauth.authorise(), function (req, res) {
	authoriseUser(req, res, function (req, res, id, admin) {
		if (!admin) {
			res.status(403).send(res_403);
		} else {
			groupModel.removeGroup(function(err, group) {
				if (err) {
					res.status(500).send({success: false, message: 'Internal Server Error. Failed to delete group'});
					return console.error('Error: ' + err);
				}
				if (!group) {
					res.status(404).send({success: false, message: 'GroupID not found.'});
				} else {
					res.status(204).json({success: true, message: 'Group ' + group.groupname + ' deleted.'});
				}
			}, req.params.id);
		}
	});
});

app.get('/api/groups/:id/readings', app.oauth.authorise(), function (req, res) {
	authoriseUser(req, res, function (req, res, id, admin, groups) {
		var isOwner = groups.filter(function(group) {
			return group.id == req.params.id;
		});
		if (isOwner.length > 0 || admin) {
			groupModel.findGroup(function(err, group){
				if (err) {
					res.status(500).send(res_500);
					return console.error('Error: ' + err);
				}
				if (!group) {
					res.status(404).send({success: false, message: 'Not Found. GroupID not found.'});
				} else {
						readingModel.findReadings(function(err, readings){
						if (err) {
							res.status(500).send({success: false, message: 'Internal Server Error. Failed to retrieve readings.'});
							return console.error('Error: ' + err);
						}
						res.status(200).json({success: true, message: readings});	
					}, createCriteria(group.users, req.params, req.query));
				}
			}, req.params.id);
		} else {
			res.status(403).send(res_403);
		}
	});
});

app.post('/api/groups/:id/readings', app.oauth.authorise(), function (req, res) {
	invalidRequest(res);
});

app.put('/api/groups/:id/readings', app.oauth.authorise(), function (req, res) {
	invalidRequest(res);
});

app.delete('/api/groups/:id/readings', app.oauth.authorise(), function (req, res) {
	invalidRequest(res);
});

app.get('/api/groups/:id/readings/:start*?,:end*?', app.oauth.authorise(), function (req, res) {
	authoriseUser(req, res, function (req, res, id, admin, groups) {
		var isOwner = groups.filter(function(group) {
			return group.id == req.params.id;
		});
		if (isOwner.length > 0 || admin) {
			groupModel.findGroup(function(err, group){
				if (err) {
					res.status(500).send(res_500);
					return console.error('Error: ' + err);
				}
				if (!group) {
					res.status(404).send({success: false, message: 'Not Found. GroupID not found.'});
				} else {
					readingModel.findReadingsByTime(function(err, readings) {
					if(err){
						res.status(500).send({success: false, message: 'Internal Server Error. Failed to retrieve readings.'});
						return console.error('Error: ' + err);
					}
						res.status(200).json({success: true, message: readings});
					}, createCriteria(group.users, req.params, req.query));
				}
			}, req.params.id);
		} else {
			res.status(403).send(res_403);
		}
	});
});

app.post('/api/groups/:id/readings/:start,:end', app.oauth.authorise(), function (req, res) {
	invalidRequest(res);
});

app.put('/api/groups/:id/readings/:start,:end', app.oauth.authorise(), function (req, res) {
	invalidRequest(res);
});

app.delete('/api/groups/:id/readings/:start,:end', app.oauth.authorise(), function (req, res) {
	invalidRequest(res);
});

var OAuthError = require('oauth2-server/lib/error');

app.use(function (err, req, res, next) {
	if (err) {
			if (err instanceof OAuthError) {
				console.log('Error/', err);
				next(err);
			} else {
				console.log('Error/', err);
				res.status(500).send({success: false, message: 'Error/' + err});
			}
	} else {
		next(err);
	}
});

app.use(app.oauth.errorHandler());

// start server on the specified port and binding host
app.listen(appenv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appenv.url);
});