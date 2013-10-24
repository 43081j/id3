var id3 = require('id3js');

id3({ file:'./track.mp3', type: 'local' }, function(err, tags) {
	/*
	 * 'local' type causes the file to be read from the local file-system
	 */
	console.log(tags);
});
