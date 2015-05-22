(function() {
	var dataviewHelper = function(dv) {
		this.dataview = dv;
	};

	dataviewHelper.prototype.getString = function(length, offset, raw) {
		var str = '',
			i;

		offset = offset || 0;
		length = length || (this.dataview.byteLength - offset);

		if(length < 0) {
			length += this.dataview.byteLength;
		}

		if(typeof Buffer !== 'undefined') {
			var data = [];

			for(i = offset; i < (offset + length); i++) {
				data.push(this.dataview.getUint8(i));
			}

			return (new Buffer(data)).toString();
		} else {
			for(i = offset; i < (offset + length); i++) {
				str += String.fromCharCode(this.dataview.getUint8(i));
			}

			if(raw) {
				return str;
			}

			return decodeURIComponent(escape(str));
		}
	};

	dataviewHelper.prototype.getStringUtf16 = function(length, offset, bom) {
		var littleEndian = false,
			str = '',
			useBuffer = false,
			i;

		offset = offset || 0;
		length = length || (this.dataview.byteLength - offset);

		if(typeof Buffer !== 'undefined') {
			str = [];
			useBuffer = true;
		}

		if(length < 0) {
			length += this.dataview.byteLength;
		}

		if(bom) {
			var bomInt = this.dataview.getUint16(offset);

			if(bomInt === 0xFFFE) {
				littleEndian = true;
			}

			offset += 2;
			length -= 2;
		}

		for(i = offset; i < (offset + length); i += 2) {
			var ch = this.dataview.getUint16(i, littleEndian);

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

	dataviewHelper.prototype.getSynch = function(num) {
		var out = 0,
			mask = 0x7f000000;
		while(mask) {
			out >>= 1;
			out |= num & mask;
			mask >>= 8;
		}
		return out;
	};

	dataviewHelper.prototype.getUint8Synch = function(offset) {
		return this.getSynch(this.dataview.getUint8(offset));
	};

	dataviewHelper.prototype.getUint32Synch = function(offset) {
		return this.getSynch(this.dataview.getUint32(offset));
	};

	/*
	 * Not really an int as such, but named for consistency
	 */
	dataviewHelper.prototype.getUint24 = function(offset, littleEndian) {
		if(littleEndian) {
			return this.dataview.getUint8(offset) + (this.dataview.getUint8(offset + 1) << 8) + (this.dataview.getUint8(offset + 2) << 16);
		}
		return this.dataview.getUint8(offset + 2) + (this.dataview.getUint8(offset + 1) << 8) + (this.dataview.getUint8(offset) << 16);
	};

	module.exports = dataviewHelper;
})();
