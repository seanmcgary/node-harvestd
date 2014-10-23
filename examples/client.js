var harvestd = require('../');

var client = new harvestd.Client({
	host: '',
	secure: true,
	token: 'foobar'
});

client.preTrack(function(event, data, cb){
	console.log(arguments);

	cb(event, data);
});


client.trackEvent('test-event', { test: 'foo' });