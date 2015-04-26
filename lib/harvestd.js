var _ = require('lodash');
var q = require('q');
var ErrorType = require('./errors').types;
var ApiError = require('./errors').ApiError;
var Request = require('./request');
var uuid = require('node-uuid');

var logwrangler = require('logwrangler');
var logger = logwrangler.create({
	logOptions: {
		ns: 'harvestd-client'
	}
});

function Client(config){
	config = config || {};
	var token = this.token = config.token;

	config = _.defaults(config, {
		host: 'localhost',
		port: 80,
		secure: false
	});

	if(!token){
		throw new ApiError(ErrorType.INVALID_API_TOKEN, {
			message: 'please provide a valid token'
		});
	}

	this.request = new Request({
		api: config
	});

	this.pretrack = function(event, data, cb){
		cb(event, data);
	};
};

Client.prototype.trackEvent = function(event, data){
	var deferred = q.defer();
	var self = this;

	data = data || {};

	if(!event || !event.length){
		return q.reject(new ApiError(ErrorType.INVALID_FIELDS, {
			fields: {
				event: 'invalid event name'
			}
		}));
	}

	self.pretrack(event, data, function(event, data){
		if(!data['$uuid']){
			logger.warn({
				message: 'missing uuid, generating one'
			});

			data['$uuid'] = uuid.v4();
		}

		if(!data['$userId']){
			logger.warn({
				message: 'missing userId, using $uuid'
			});
			data['$userId'] = data['$uuid'];
		}

		var payload = {
			event: event,
			data: data,
			token: self.token
		};

		return self.request.post({
			url: '/track',
			data: payload
		})
		.then(function(result){
			deferred.resolve(result || {});
		}, function(err){
			deferred.reject(err);
		});
	});

	return deferred.promise;
};

Client.prototype.preTrack = function(handler){
	if(typeof handler === 'function'){
		this.pretrack = handler;
	}
};

exports.Client = Client;