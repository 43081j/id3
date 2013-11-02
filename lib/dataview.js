/*
 * Add some helper methods to the DataView object
 */

DataView.prototype.getString = function(length, offset) {
	offset = offset || 0;
	length = length || (this.byteLength - offset);
	if(length < 0) {
		length += this.byteLength;
	}
	var str = '';
	for(var i = offset; i < (offset + length); i++) {
		str += String.fromCharCode(this.getUint8(i));
	}
	return str;
};

DataView.prototype.getStringUtf16 = function(length, offset, bom) {
	offset = offset || 0;
	length = length || (this.byteLength - offset);
	var littleEndian = false,
		str = '';
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
			str += String.fromCharCode(ch);
		} else if(ch >= 0x10000 && ch <= 0x10FFFF) {
			ch -= 0x10000;
			str += String.fromCharCode(((0xFFC00 & ch) >> 10) + 0xD800) + String.fromCharCode((0x3FF & ch) + 0xDC00);
		}
	}
	return decodeURIComponent(escape(str));
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

DataView.prototype.getUint32Synch = function(offset) {
	return this.getSynch(this.getUint32(offset));
};

DataView.prototype.getUint24 = function(offset) {
	return this.getUint8(offset + 2) + (this.getUint8(offset + 1) << 8) + (this.getUint8(offset) << 16);
};
