/*
 * ID3 (v1/v2) Parser
 * 43081j
 * License: MIT, see LICENSE
 */

(function() {
	/*
	 * lib/reader.js
	 * Readers (local, ajax, file)
	 */
	var Reader = function(type) {
		this.type = type || Reader.OPEN_URI;
		this.size = null;
		this.file = null;
	};

	Reader.OPEN_FILE = 1;
	Reader.OPEN_URI = 2;
	Reader.OPEN_LOCAL = 3;

	if(typeof require === 'function') {
		var fs = require('fs');
	}

	Reader.prototype.open = function(file, callback) {
		this.file = file;
		var self = this;
		switch(this.type) {
			case Reader.OPEN_LOCAL:
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
			break;
			case Reader.OPEN_FILE:
				this.size = this.file.size;
				callback();
			break;
			default:
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
			break;
		}
	};

	Reader.prototype.close = function() {
		if(this.type === Reader.OPEN_LOCAL) {
			fs.close(this.fd);
		}
	};

	Reader.prototype.read = function(length, position, callback) {
		if(typeof position === 'function') {
			callback = position;
			position = 0;
		}
		if(this.type === Reader.OPEN_LOCAL) {
			this.readLocal(length, position, callback);
		} else if(this.type === Reader.OPEN_FILE) {
			this.readFile(length, position, callback);
		} else {
			this.readUri(length, position, callback);
		}
	};

	Reader.prototype.readBlob = function(length, position, type, callback) {
		if(typeof position === 'function') {
			callback = position;
			position = 0;
		} else if(typeof type === 'function') {
			callback = type;
			type = 'application/octet-stream';
		}
		this.read(length, position, function(err, data) {
			if(err) {
				callback(err);
				return;
			}
			callback(null, new Blob([data], {type: type}));
		});
	};

	/*
	 * Local reader
	 */
	Reader.prototype.readLocal = function(length, position, callback) {
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

	/*
	 * lib/dataview-extra.js
	 */
	DataView.prototype.getString = function(length, offset, raw) {
		offset = offset || 0;
		length = length || (this.byteLength - offset);
		if(length < 0) {
			length += this.byteLength;
		}
		var str = '';
		if(typeof Buffer !== 'undefined') {
			var data = [];
			for(var i = offset; i < (offset + length); i++) {
				data.push(this.getUint8(i));
			}
			return (new Buffer(data)).toString();
		} else {
			for(var i = offset; i < (offset + length); i++) {
				str += String.fromCharCode(this.getUint8(i));
			}
			if(raw) {
				return str;
			}
			return decodeURIComponent(escape(str));
		}
	};

	DataView.prototype.getStringUtf16 = function(length, offset, bom) {
		offset = offset || 0;
		length = length || (this.byteLength - offset);
		var littleEndian = false,
			str = '',
			useBuffer = false;
		if(typeof Buffer !== 'undefined') {
			str = [];
			useBuffer = true;
		}
		if(length < 0) {
			length += this.byteLength;
		}
		if(bom) {
			var bomInt = this.getUint16(offset);
			if(bomInt === 0xFFFE) {
				littleEndian = true;
			}
			offset += 2;
			length -= 2;
		}
		for(var i = offset; i < (offset + length); i += 2) {
			var ch = this.getUint16(i, littleEndian);
			if((ch >= 0 && ch <= 0xD7FF) || (ch >= 0xE000 && ch <= 0xFFFF)) {
				if(useBuffer) {
					str.push(ch);
				} else {
					str += String.fromCharCode(ch);
				}
			} else if(ch >= 0x10000 && ch <= 0x10FFFF) {
				ch -= 0x10000;
				if(useBuffer) {
					str.push(((0xFFC00 & ch) >> 10) + 0xD800);
					str.push((0x3FF & ch) + 0xDC00);
				} else {
					str += String.fromCharCode(((0xFFC00 & ch) >> 10) + 0xD800) + String.fromCharCode((0x3FF & ch) + 0xDC00);
				}
			}
		}
		if(useBuffer) {
			return (new Buffer(str)).toString();
		} else {
			return decodeURIComponent(escape(str));
		}
	};

	DataView.prototype.getSynch = function(num) {
		var out = 0,
			mask = 0x7f000000;
		while(mask) {
			out >>= 1;
			out |= num & mask;
			mask >>= 8;
		}
		return out;
	};

	DataView.prototype.getUint8Synch = function(offset) {
		return this.getSynch(this.getUint8(offset));
	};

	DataView.prototype.getUint32Synch = function(offset) {
		return this.getSynch(this.getUint32(offset));
	};

	/*
	 * Not really an int as such, but named for consistency
	 */
	DataView.prototype.getUint24 = function(offset, littleEndian) {
		if(littleEndian) {
			return this.getUint8(offset) + (this.getUint8(offset + 1) << 8) + (this.getUint8(offset + 2) << 16);
		}
		return this.getUint8(offset + 2) + (this.getUint8(offset + 1) << 8) + (this.getUint8(offset) << 16);
	};

	var id3 = function(opts, cb) {
		/*
		 * Initialise ID3
		 */
		var options = {
			type: id3.OPEN_URI,
		};
		if(typeof opts === 'string') {
			opts = {file: opts, type: id3.OPEN_URI};
		} else if(typeof window !== 'undefined' && window.File && opts instanceof window.File) {
			opts = {file: opts, type: id3.OPEN_FILE};
		}
		for(var k in opts) {
			options[k] = opts[k];
		}

		if(!options.file) {
			return cb('No file was set');
		}

		if(options.type === id3.OPEN_FILE) {
			if(typeof window === 'undefined' || !window.File || !window.FileReader || typeof ArrayBuffer === 'undefined') {
				return cb('Browser does not have support for the File API and/or ArrayBuffers');
			}
		} else if(options.type === id3.OPEN_LOCAL) {
			if(typeof require !== 'function') {
				return cb('Local paths may not be read within a browser');
			}
		} else {
		}

		/*
		 * lib/genres.js
		 * Genre list
		 */

		var Genres = [
			'Blues',
			'Classic Rock',
			'Country',
			'Dance',
			'Disco',
			'Funk',
			'Grunge',
			'Hip-Hop',
			'Jazz',
			'Metal',
			'New Age',
			'Oldies',
			'Other',
			'Pop',
			'R&B',
			'Rap',
			'Reggae',
			'Rock',
			'Techno',
			'Industrial',
			'Alternative',
			'Ska',
			'Death Metal',
			'Pranks',
			'Soundtrack',
			'Euro-Techno',
			'Ambient',
			'Trip-Hop',
			'Vocal',
			'Jazz+Funk',
			'Fusion',
			'Trance',
			'Classical',
			'Instrumental',
			'Acid',
			'House',
			'Game',
			'Sound Clip',
			'Gospel',
			'Noise',
			'AlternRock',
			'Bass',
			'Soul',
			'Punk',
			'Space',
			'Meditative',
			'Instrumental Pop',
			'Instrumental Rock',
			'Ethnic',
			'Gothic',
			'Darkwave',
			'Techno-Industrial',
			'Electronic',
			'Pop-Folk',
			'Eurodance',
			'Dream',
			'Southern Rock',
			'Comedy',
			'Cult',
			'Gangsta Rap',
			'Top 40',
			'Christian Rap',
			'Pop / Funk',
			'Jungle',
			'Native American',
			'Cabaret',
			'New Wave',
			'Psychedelic',
			'Rave',
			'Showtunes',
			'Trailer',
			'Lo-Fi',
			'Tribal',
			'Acid Punk',
			'Acid Jazz',
			'Polka',
			'Retro',
			'Musical',
			'Rock & Roll',
			'Hard Rock',
			'Folk',
			'Folk-Rock',
			'National Folk',
			'Swing',
			'Fast  Fusion',
			'Bebob',
			'Latin',
			'Revival',
			'Celtic',
			'Bluegrass',
			'Avantgarde',
			'Gothic Rock',
			'Progressive Rock',
			'Psychedelic Rock',
			'Symphonic Rock',
			'Slow Rock',
			'Big Band',
			'Chorus',
			'Easy Listening',
			'Acoustic',
			'Humour',
			'Speech',
			'Chanson',
			'Opera',
			'Chamber Music',
			'Sonata',
			'Symphony',
			'Booty Bass',
			'Primus',
			'Porn Groove',
			'Satire',
			'Slow Jam',
			'Club',
			'Tango',
			'Samba',
			'Folklore',
			'Ballad',
			'Power Ballad',
			'Rhythmic Soul',
			'Freestyle',
			'Duet',
			'Punk Rock',
			'Drum Solo',
			'A Cappella',
			'Euro-House',
			'Dance Hall',
			'Goa',
			'Drum & Bass',
			'Club-House',
			'Hardcore',
			'Terror',
			'Indie',
			'BritPop',
			'Negerpunk',
			'Polsk Punk',
			'Beat',
			'Christian Gangsta Rap',
			'Heavy Metal',
			'Black Metal',
			'Crossover',
			'Contemporary Christian',
			'Christian Rock',
			'Merengue',
			'Salsa',
			'Thrash Metal',
			'Anime',
			'JPop',
			'Synthpop',
			'Rock/Pop'
		];


		/*
		 * lib/id3frame.js
		 * ID3Frame
		 */

		var ID3Frame = {};

		/*
		 * ID3v2.3 and later frame types
		 */
		ID3Frame.types = {
			/*
			 * Textual frames
			 */
			'TALB': 'album',
			'TBPM': 'bpm',
			'TCOM': 'composer',
			'TCON': 'genre',
			'TCOP': 'copyright',
			'TDEN': 'encoding-time',
			'TDLY': 'playlist-delay',
			'TDOR': 'original-release-time',
			'TDRC': 'recording-time',
			'TDRL': 'release-time',
			'TDTG': 'tagging-time',
			'TENC': 'encoder',
			'TEXT': 'writer',
			'TFLT': 'file-type',
			'TIPL': 'involved-people',
			'TIT1': 'content-group',
			'TIT2': 'title',
			'TIT3': 'subtitle',
			'TKEY': 'initial-key',
			'TLAN': 'language',
			'TLEN': 'length',
			'TMCL': 'credits',
			'TMED': 'media-type',
			'TMOO': 'mood',
			'TOAL': 'original-album',
			'TOFN': 'original-filename',
			'TOLY': 'original-writer',
			'TOPE': 'original-artist',
			'TOWN': 'owner',
			'TPE1': 'artist',
			'TPE2': 'band',
			'TPE3': 'conductor',
			'TPE4': 'remixer',
			'TPOS': 'set-part',
			'TPRO': 'produced-notice',
			'TPUB': 'publisher',
			'TRCK': 'track',
			'TRSN': 'radio-name',
			'TRSO': 'radio-owner',
			'TSOA': 'album-sort',
			'TSOP': 'performer-sort',
			'TSOT': 'title-sort',
			'TSRC': 'isrc',
			'TSSE': 'encoder-settings',
			'TSST': 'set-subtitle',
			/*
			 * Textual frames (<=2.2)
			 */
			'TAL': 'album',
			'TBP': 'bpm',
			'TCM': 'composer',
			'TCO': 'genre',
			'TCR': 'copyright',
			'TDY': 'playlist-delay',
			'TEN': 'encoder',
			'TFT': 'file-type',
			'TKE': 'initial-key',
			'TLA': 'language',
			'TLE': 'length',
			'TMT': 'media-type',
			'TOA': 'original-artist',
			'TOF': 'original-filename',
			'TOL': 'original-writer',
			'TOT': 'original-album',
			'TP1': 'artist',
			'TP2': 'band',
			'TP3': 'conductor',
			'TP4': 'remixer',
			'TPA': 'set-part',
			'TPB': 'publisher',
			'TRC': 'isrc',
			'TRK': 'track',
			'TSS': 'encoder-settings',
			'TT1': 'content-group',
			'TT2': 'title',
			'TT3': 'subtitle',
			'TXT': 'writer',
			/*
			 * URL frames
			 */
			'WCOM': 'url-commercial',
			'WCOP': 'url-legal',
			'WOAF': 'url-file',
			'WOAR': 'url-artist',
			'WOAS': 'url-source',
			'WORS': 'url-radio',
			'WPAY': 'url-payment',
			'WPUB': 'url-publisher',
			/*
			 * URL frames (<=2.2)
			 */
			'WAF': 'url-file',
			'WAR': 'url-artist',
			'WAS': 'url-source',
			'WCM': 'url-commercial',
			'WCP': 'url-copyright',
			'WPB': 'url-publisher',
			/*
			 * Comment frame
			 */
			'COMM': 'comments',
			/*
			 * Image frame
			 */
			'APIC': 'image',
			'PIC': 'image'
		};

		/*
		 * ID3 image types
		 */
		ID3Frame.imageTypes = [
			'other',
			'file-icon',
			'icon',
			'cover-front',
			'cover-back',
			'leaflet',
			'media',
			'artist-lead',
			'artist',
			'conductor',
			'band',
			'composer',
			'writer',
			'location',
			'during-recording',
			'during-performance',
			'screen',
			'fish',
			'illustration',
			'logo-band',
			'logo-publisher'
		];

		/*
		 * ID3v2.3 and later
		 */
		ID3Frame.parse = function(buffer, major, minor) {
			minor = minor || 0;
			major = major || 4;
			var result = {tag: null, value: null},
				dv = new DataView(buffer);
			if(major < 3) {
				return ID3Frame.parseLegacy(buffer);
			}
			var header = {
				id: dv.getString(4),
				type: dv.getString(1),
				size: dv.getUint32Synch(4),
				flags: [
					dv.getUint8(8),
					dv.getUint8(9)
				]
			};
			/*
			 * No support for compressed, unsychronised, etc frames
			 */
			if(header.flags[1] !== 0) {
				return false;
			}
			if(!header.id in ID3Frame.types) {
				return false;
			}
			result.tag = ID3Frame.types[header.id];
			if(header.type === 'T') {
				var encoding = dv.getUint8(10);
				/*
				 * TODO: Implement UTF-8, UTF-16 and UTF-16 with BOM properly?
				 */
				if(encoding === 0 || encoding === 3) {
					result.value = dv.getString(-11, 11);
				} else if(encoding === 1) {
					result.value = dv.getStringUtf16(-11, 11, true);
				} else if(encoding === 2) {
					result.value = dv.getStringUtf16(-11, 11);
				} else {
					return false;
				}
				if(header.id === 'TCON' && !!parseInt(result.value)) {
					result.value = Genres[parseInt(result.value)];
				}
			} else if(header.type === 'W') {
				result.value = dv.getString(-10, 10);
			} else if(header.id === 'COMM') {
				/*
				 * TODO: Implement UTF-8, UTF-16 and UTF-16 with BOM properly?
				 */
				var encoding = dv.getUint8(10),
					variableStart = 14, variableLength = 0;
				/*
				 * Skip the comment description and retrieve only the comment its self
				 */
				for(var i = variableStart;; i++) {
					if(encoding === 1 || encoding === 2) {
						if(dv.getUint16(i) === 0x0000) {
							variableStart = i + 2;
							break;
						}
						i++;
					} else {
						if(dv.getUint8(i) === 0x00) {
							variableStart = i + 1;
							break;
						}
					}
				}
				if(encoding === 0 || encoding === 3) {
					result.value = dv.getString(-1 * variableStart, variableStart);
				} else if(encoding === 1) {
					result.value = dv.getStringUtf16(-1 * variableStart, variableStart, true);
				} else if(encoding === 2) {
					result.value = dv.getStringUtf16(-1 * variableStart, variableStart);
				} else {
					return false;
				}
			} else if(header.id === 'APIC') {
				var encoding = dv.getUint8(10),
					image = {
						type: null,
						mime: null,
						description: null,
						data: null
					};
				var variableStart = 11, variableLength = 0;
				for(var i = variableStart;;i++) {
					if(dv.getUint8(i) === 0x00) {
						variableLength = i - variableStart;
						break;
					}
				}
				image.mime = dv.getString(variableLength, variableStart);
				image.type = ID3Frame.imageTypes[dv.getUint8(variableStart + variableLength + 1)] || 'other';
				variableStart += variableLength + 2;
				variableLength = 0;
				for(var i = variableStart;; i++) {
					if(dv.getUint8(i) === 0x00) {
						variableLength = i - variableStart;
						break;
					}
				}
				image.description = (variableLength === 0 ? null : dv.getString(variableLength, variableStart));
				image.data = buffer.slice(variableStart + 1);
				result.value = image;
			}
			return (result.tag ? result : false);
		};

		/*
		 * ID3v2.2 and earlier
		 */
		ID3Frame.parseLegacy = function(buffer) {
			var result = {tag: null, value: null},
				dv = new DataView(buffer),
				header = {
					id: dv.getString(3),
					type: dv.getString(1),
					size: dv.getUint24(3)
				};
			if(!header.id in ID3Frame.types) {
				return false;
			}
			result.tag = ID3Frame.types[header.id];
			if(header.type === 'T') {
				var encoding = dv.getUint8(7);
				/*
				 * TODO: Implement UTF-8, UTF-16 and UTF-16 with BOM properly?
				 */
				result.value = dv.getString(-7, 7);
				if(header.id === 'TCO' && !!parseInt(result.value)) {
					result.value = Genres[parseInt(result.value)];
				}
			} else if(header.type === 'W') {
				result.value = dv.getString(-7, 7);
			} else if(header.id === 'COM') {
				/*
				 * TODO: Implement UTF-8, UTF-16 and UTF-16 with BOM properly?
				 */
				var encoding = dv.getUint8(6);
				result.value = dv.getString(-10, 10);
				if(result.value.indexOf('\x00') !== -1) {
					result.value = result.value.substr(result.value.indexOf('\x00') + 1);
				}
			} else if(header.id === 'PIC') {
				var encoding = dv.getUint8(6),
					image = {
						type: null,
						mime: 'image/' + dv.getString(3, 7).toLowerCase(),
						description: null,
						data: null
					};
				image.type = ID3Frame.imageTypes[dv.getUint8(11)] || 'other';
				var variableStart = 11, variableLength = 0;
				for(var i = variableStart;; i++) {
					if(dv.getUint8(i) === 0x00) {
						variableLength = i - variableStart;
						break;
					}
				}
				image.description = (variableLength === 0 ? null : dv.getString(variableLength, variableStart));
				image.data = buffer.slice(variableStart + 1);
				result.value = image;
			}
			return (result.tag ? result : false);
		};

		/*
		 * lib/id3tag.js
		 * Parse an ID3 tag
		 */

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
				process = function(err) {
					if(processed.v1 && processed.v2) {
						tags.title = tags.v2.title || tags.v1.title;
						tags.album = tags.v2.album || tags.v1.album;
						tags.artist = tags.v2.artist || tags.v1.artist;
						tags.year = tags.v1.year;
						callback(err, tags);
					}
				};
			/*
			 * Read the last 128 bytes (ID3v1)
			 */
			handle.read(128, handle.size - 128, function(err, buffer) {
				if(err) {
					return process('Could not read file');
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
					return process('Could not read file');
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

		/*
		 * Read the file
		 */

		var handle = new Reader(options.type);

		handle.open(options.file, function(err) {
			if(err) {
				return cb('Could not open specified file');
			}
			ID3Tag.parse(handle, function(err, tags) {
				cb(err, tags);
				handle.close()
			});
		});
	};

	id3.OPEN_FILE = Reader.OPEN_FILE;
	id3.OPEN_URI = Reader.OPEN_URI;
	id3.OPEN_LOCAL = Reader.OPEN_LOCAL;

	if(typeof module !== 'undefined' && module.exports) {
		module.exports = id3;
	} else {
		if(typeof define === 'function' && define.amd) {
			define('id3', [], function() {
				return id3;
			});
		} else {
			window.id3 = id3;
		}
	}
})();
