/*
 * Parse an ID3v2 frame
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
	 * Comment frame
	 */
	'COMM': 'comments',
	/*
	 * Image frame
	 */
	'APIC': 'image'
};

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
			result.value = dv.getString(-13, 13);
		} else if(encoding === 2) {
			result.value = dv.getString(-11, 11);
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
		var encoding = dv.getUint8(10);
		result.value = dv.getString(-14, 14);
		if(result.value.indexOf('\x00') !== -1) {
			result.value = result.value.substr(result.value.indexOf('\x00') + 1);
		}
	} else if(header.id === 'APIC') {
		var encoding = dv.getUint8(10),
			image = {
				type: null,
				mime: null,
				description: null,
				data: null
			},
			imageTypes = [
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
		var variableStart = 11, variableLength = 0;
		for(var i = variableStart;;i++) {
			if(dv.getUint8(i) === 0x00) {
				variableLength = i - variableStart;
				break;
			}
		}
		image.mime = dv.getString(variableLength, variableStart);
		image.type = imageTypes[dv.getUint8(variableStart + variableLength + 1)] || 'other';
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
};
