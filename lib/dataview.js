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
