/*
 * Reader to read in the bytes using ArrayBuffers
 */
var Reader = function(type) {
	this.type = type || 'uri';
	this.size = null;
	this.file = null;
};

Reader.prototype.open = function(file, callback) {
	this.file = file;
	var self = this;
	if(this.type === 'local') {
		fs.stat(this.file, function(err, stat) {
			if(err) {
				return callback(err);
			}
			self.size = stat.size;
			fs.open(self.file, 'r', function(err, fd) {
				if(err) {
					return callback(err);
				}
				self.fd = fd;
				callback();
			});
		});
	} else if(this.type === 'file') {
		this.size = this.file.size;
		callback();
	} else {
		this.ajax(
			{
				uri: this.file,
				type: 'HEAD',
			},
			function(err, resp, xhr) {
				if(err) {
					return callback(err);
				}
				self.size = parseInt(xhr.getResponseHeader('Content-Length'));
				callback();
			}
		);
	}
};

Reader.prototype.close = function() {
	if(this.type === 'local') {
		fs.close(this.fd);
	}
};

Reader.prototype.read = function(length, position, callback) {
	if(this.type === 'local') {
		this.readPath(length, position, callback);
	} else if(this.type === 'file') {
		this.readFile(length, position, callback);
	} else {
		this.readUri(length, position, callback);
	}
};

/*
 * Local reader
 */
Reader.prototype.readPath = function(length, position, callback) {
	var buffer = new Buffer(length);
	fs.read(this.fd, buffer, 0, length, position, function(err, bytesRead, buffer) {
		if(err) {
			return callback(err);
		}
		var ab = new ArrayBuffer(buffer.length),
			view = new Uint8Array(ab);
		for(var i = 0; i < buffer.length; i++) {
			view[i] = buffer[i];
		}
		callback(null, ab);
	});
};

/*
 * URL reader
 */
Reader.prototype.ajax = function(opts, callback) {
	var options = {
		type: 'GET',
		uri: null,
		responseType: 'text'
	};
	if(typeof opts === 'string') {
		opts = {uri: opts};
	}
	for(var k in opts) {
		options[k] = opts[k];
	}
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if(xhr.readyState !== 4) return;
		if(xhr.status !== 200 && xhr.status !== 206) {
			return callback('Received non-200/206 response (' + xhr.status + ')');
		}
		callback(null, xhr.response, xhr);
	};
	xhr.responseType = options.responseType;
	xhr.open(options.type, options.uri, true);
	if(options.range) {
		options.range = [].concat(options.range);
		if(options.range.length === 2) {
			xhr.setRequestHeader('Range', 'bytes=' + options.range[0] + '-' + options.range[1]);
		} else {
			xhr.setRequestHeader('Range', 'bytes=' + options.range[0]);
		}
	}
	xhr.send();
};

Reader.prototype.readUri = function(length, position, callback) {
	this.ajax(
		{
			uri: this.file,
			type: 'GET',
			responseType: 'arraybuffer',
			range: [position, position+length-1]
		},
		function(err, buffer) {
			if(err) {
				return callback(err);
			}
			return callback(null, buffer);
		}
	);
};

/*
 * File API reader
 */
Reader.prototype.readFile = function(length, position, callback) {
	var slice = this.file.slice(position, position+length),
		fr = new FileReader();
	fr.onload = function(e) {
		callback(null, e.target.result);
	};
	fr.onerror = function(e) {
		callback('File read failed');
	};
	fr.readAsArrayBuffer(slice);
};
