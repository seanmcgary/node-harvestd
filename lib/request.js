var _ = require('lodash');
var q = require('q');
var qs = require('querystring');

var logwrangler = require('logwrangler');
var logger = logwrangler.create({
	logOptions: {
		ns: 'harvestd-request'
	}
}, true);

var _http = require('http');
var _https = require('https');

_http.globalAgent.maxSockets = 1024;
_https.globalAgent.maxSockets = 1024;

var getTime = function(startTime){
	var endTime = new Date();
	return endTime - startTime;
};

var Request = function(config){

	var self = this;
	var makeRequest = function(method, url, data, headers, eventName, transformOptions, transformData){
		var deferred = q.defer();
		data = data || {};
		transformData = transformData || {};
		transformOptions = transformOptions || {};

		headers = _.extend(headers || {}, {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-cache',
			'User-Agent': 'TLWebstore'
		});

		var options = _.extend({}, config.api, {
			path: url,
			data: data,
			method: method,
			headers: headers
		});

		var http = config.api.useSecure ? _https : _http;

		var startTime = new Date();

		var logData = {
			message: url,
			data: {
				url: url,
				method: method
			}
		};
		var request = http.request(options, function(res){		

			var data = '';
			res.on('data', function(d){
				data += d.toString();
			});

			res.on('end', function(){
				var statusCode = res.statusCode;
				var responseTime = getTime(startTime);
				var responseTimeStr = responseTime + 'ms';

				var statusCodeTrunc = Math.floor(statusCode / 100);

				logData.data.statusCode = statusCode;
				logData.data.responseTime = responseTime;

				if(statusCodeTrunc == 2){
					logger.info(logData);	
				} else {
					logger.warn(logData);
				}
				var json;

				try {
					json = JSON.parse(data);
				} catch(e){}

				if(data.length && !json){
					_.extend(logData.data, {
						errorData: data
					});
					logger.error(logData);

					return deferred.reject({ err: 'invalid_json_response' });
				}

				if(statusCodeTrunc == 2){
					return deferred.resolve(json);
				} else {
					_.extend(logData.data, {
						errorData: data
					});
					logger.log(logData);
					return deferred.reject(json);
				}
			});
		});

		request.on('error', function(error){
			_.extend(logData.data, {
				errorData: error
			});
			logData.message = 'error';
			logger.log(logData);
			return deferred.reject({ err: error });
		});

		// 30 second timeout for now
		request.setTimeout(30000, function(){
			logData.message = 'timeout';
			logger.log(logData);
			return deferred.reject({ err: 'timeout' });
		});

		if(method != 'GET'){
			request.write(JSON.stringify(data));
		}
		request.end();

		return deferred.promise;
	};

	

	var get = self.get = function(options){
		var url = options.url || '';
		var data = options.data || {};

		var queryString = qs.stringify(data);

		if(queryString.length){
			url += ('?' + queryString);
		}

		return makeRequest('GET', url, {}, options.headers, options.eventName, options.transformOptions, options.transformData);
	};

	var post = self.post = function(options){
		return makeRequest('POST', options.url, options.data, options.headers, options.eventName, options.transformOptions, options.transformData);
	};

	var del = self.del = function(options){
		return makeRequest('DELETE', options.url, options.data, options.headers, options.eventName, options.transformOptions, options.transformData);
	};

	var put = self.put = function(options){
		return makeRequest('PUT', options.url, options.data, options.headers, options.eventName, options.transformOptions, options.transformData);
	};
};

module.exports = Request;