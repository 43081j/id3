var ID3Tag = {};

ID3Tag.parse = function(handle, callback) {
	var tags = {
			title: null,
			album: null,
			artist: null,
			year: null,
			v1: {
					title: null,
					artist: null,
					album: null,
					year: null,
					comment: null,
					track: null,
					version: 1.0
				},
			v2: {
					version: [null, null]
				}
		},
		processed = {
			v1: false,
			v2: false
		},
		process = function() {
			if(processed.v1 && processed.v2) {
				tags.title = tags.v2.title || tags.v1.title;
				tags.album = tags.v2.album || tags.v1.album;
				tags.artist = tags.v2.artist || tags.v1.artist;
				tags.year = tags.v1.year;
				callback(null, tags);
			}
		};
	/*
	 * Read the last 128 bytes (ID3v1)
	 */
	handle.read(128, handle.size - 128, function(err, buffer) {
		if(err) {
			return callback('Could not read file');
		}
		var dv = new DataView(buffer);
		if(buffer.byteLength !== 128 || dv.getString(3, null, true) !== 'TAG') {
			processed.v1 = true;
			return process();
		}
		tags.v1.title = dv.getString(30, 3).replace(/(^\s+|\s+$)/, '') || null;
		tags.v1.artist = dv.getString(30, 33).replace(/(^\s+|\s+$)/, '') || null;
		tags.v1.album = dv.getString(30, 63).replace(/(^\s+|\s+$)/, '') || null;
		tags.v1.year = dv.getString(4, 93).replace(/(^\s+|\s+$)/, '') || null;
		/*
		 * If there is a zero byte at [125], the comment is 28 bytes and the remaining 2 are [0, trackno]
		 */
		if(dv.getUint8(125) === 0) {
			tags.v1.comment = dv.getString(28, 97).replace(/(^\s+|\s+$)/, '');
			tags.v1.version = 1.1;
			tags.v1.track = dv.getUint8(126);
		} else {
			tags.v1.comment = dv.getString(30, 97).replace(/(^\s+|\s+$)/, '');
		}
		/*
		 * Lookup the genre index in the predefined genres array
		 */
		tags.v1.genre = Genres[dv.getUint8(127)] || null;
		processed.v1 = true;
		process();
	});
	/*
	 * Read 14 bytes (10 for ID3v2 header, 4 for possible extended header size)
	 * Assuming the ID3v2 tag is prepended
	 */
	handle.read(14, 0, function(err, buffer) {
		if(err) {
			return callback('Could not read file');
		}
		var dv = new DataView(buffer),
			headerSize = 10,
			tagSize = 0,
			tagFlags;
		/*
		 * Be sure that the buffer is at least the size of an id3v2 header
		 * Assume incompatibility if a major version of > 4 is used
		 */
		if(buffer.byteLength !== 14 || dv.getString(3, null, true) !== 'ID3' || dv.getUint8(3) > 4) {
			processed.v2 = true;
			return process();
		}
		tags.v2.version = [
			dv.getUint8(3),
			dv.getUint8(4)
		];
		tagFlags = dv.getUint8(5);
		/*
		 * Do not support unsynchronisation
		 */
		if((tagFlags & 0x80) !== 0) {
			processed.v2 = true;
			return process();
		}
		/*
		 * Increment the header size to offset by if an extended header exists
		 */
		if((tagFlags & 0x40) !== 0) {
			headerSize += dv.getUint32Synch(11);
		}
		/*
		 * Calculate the tag size to be read
		 */
		tagSize += dv.getUint32Synch(6);
		handle.read(tagSize, headerSize, function(err, buffer) {
			if(err) {
				processed.v2 = true;
				return process();
			}
			var dv = new DataView(buffer),
				position = 0;
			while(position < buffer.byteLength) {
				var frame,
					slice,
					frameBit,
					isFrame = true;
				for(var i = 0; i < 3; i++) {
					frameBit = dv.getUint8(position + i);
					if((frameBit < 0x41 || frameBit > 0x5A) && (frameBit < 0x30 || frameBit > 0x39)) {
						isFrame = false;
					}
				}
				if(!isFrame) break;
				/*
				 * < v2.3, frame ID is 3 chars, size is 3 bytes making a total size of 6 bytes
				 * >= v2.3, frame ID is 4 chars, size is 4 bytes, flags are 2 bytes, total 10 bytes
				 */
				if(tags.v2.version[0] < 3) {
					slice = buffer.slice(position, position + 6 + dv.getUint24(position + 3));
				} else {
					slice = buffer.slice(position, position + 10 + dv.getUint32Synch(position + 4));
				}
				frame = ID3Frame.parse(slice, tags.v2.version[0]);
				if(frame) {
					tags.v2[frame.tag] = frame.value;
				}
				position += slice.byteLength;
			}
			processed.v2 = true;
			process();
		});
	});
};
