var Reader = require('./reader');
var ID3Tag = require('./id3tag');

var id3 = function (opts, cb) {
	/*
	 * Initialise ID3
	 */
	var options = {
		type: id3.OPEN_URI,
	};
	if (typeof opts === 'string') {
		opts = {
			file: opts,
			type: id3.OPEN_URI
		};
	} else if (typeof window !== 'undefined' && window.File && opts instanceof window.File) {
		opts = {
			file: opts,
			type: id3.OPEN_FILE
		};
	}
	for (var k in opts) {
		options[k] = opts[k];
	}

	if (!options.file) {
		return cb('No file was set');
	}

	if (options.type === id3.OPEN_FILE) {
		if (typeof window === 'undefined' || !window.File || !window.FileReader || typeof ArrayBuffer === 'undefined') {
			return cb('Browser does not have support for the File API and/or ArrayBuffers');
		}
	} else if (options.type === id3.OPEN_LOCAL) {
		if (typeof require !== 'function') {
			return cb('Local paths may not be read within a browser');
		}
	} else {}
	var handle = new Reader(options.type);

	handle.open(options.file, function (err) {
		if (err) {
			return cb('Could not open specified file');
		}
		ID3Tag.parse(handle, function (err, tags) {
			cb(err, tags);
			// we are not actually worried if close fails
			handle.close(function () {})
		});
	});
};

id3.OPEN_FILE = Reader.OPEN_FILE;
id3.OPEN_URI = Reader.OPEN_URI;
id3.OPEN_LOCAL = Reader.OPEN_LOCAL;

module.exports = id3;