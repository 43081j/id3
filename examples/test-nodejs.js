var mp4 = require('mp4js');

mp4({ file:'./track.m4a', type: 'local' }, function(err, tags) {
	/*
	 * 'local' type causes the file to be read from the local file-system
	 */
	console.log(tags);
});
