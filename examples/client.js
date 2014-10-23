var harvestd = require('../');

var client = new harvestd.Client({
	host: '',
	secure: true,
	token: 'foobar'
});

client.preTrack(function(event, data, cb){
	// do stuff here
	
	cb(event, data);
});


client.trackEvent('test-event', { test: 'foo' });