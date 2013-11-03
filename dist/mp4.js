/**
 * MP4 Metadata Parser
 *
 * Thanks to 43081j for his work on the ID3 pendant
 * @preserve
 */

(function () {
    var mp4 = function (opts, cb) {
      var options = {
        type: 'uri',
      };
      if (typeof opts === 'string') {
        opts = {
          file: opts,
          type: 'uri'
        };
      } else if (typeof window !== 'undefined' && window.File && opts instanceof window.File) {
        opts = {
          file: opts,
          type: 'file'
        };
      }
      for (var k in opts) {
        options[k] = opts[k];
      }

      if (!options.file) {
        return cb('No file was set');
      }

      if (options.type === 'file') {
        if (typeof window === 'undefined' || !window.File || !window.FileReader || typeof ArrayBuffer === 'undefined') {
          return cb('Browser does not have support for the File API and/or ArrayBuffers');
        }
      } else if (options.type === 'local') {
        if (typeof require !== 'function') {
          return cb('Local paths may not be read within a browser');
        }
        var fs = require('fs');
      } else {}/* Buffer Utitlities */

var MP4Tag = {};

MP4Tag.parse = function(handle, callback) {
  function ab2b(ab) {
    var buffer = new Buffer(ab.byteLength),
      view = new Uint8Array(ab);

    for (var i = 0; i < buffer.length; i++) {
      buffer[i] = view[i];
    }

    return buffer;
  }

  function readString(ab, length, offset) {
    return ab2b(ab)
      .toString('utf8', offset, length + offset);
  }

  var containers = [
    "moov", "udta", "mdia", "meta", "ilst",
    "stbl", "minf", "moof", "traf", "trak",
    "stsd"
  ];

  var atom_data_types = {
    0: 'IMPLICIT', // for use with tags for which no type needs to be indicated because only one type is allowed
    1: 'UTF8', // without any count or null terminator
    2: 'UTF16', // also known as UTF-16BE
    3: 'SJIS', // deprecated unless it is needed for special Japanese characters
    6: 'HTML', // the HTML file header specifies which HTML version
    7: 'XML', // the XML header must identify the DTD or schemas
    8: 'UUID', // also known as GUID; stored as 16 bytes in binary (valid as an ID)
    9: 'ISRC', // stored as UTF-8 text (valid as an ID)
    10: 'MI3P', // stored as UTF-8 text (valid as an ID)
    12: 'GIF', // (deprecated) a GIF image
    13: 'JPEG', // a JPEG image
    14: 'PNG', // a PNG image
    15: 'URL', // absolute, in UTF-8 characters
    16: 'DURATION', // in milliseconds, 32-bit integer
    17: 'DATETIME', // in UTC, counting seconds since midnight, January 1, 1904; 32 or 64-bits
    18: 'GENRED', // a list of enumerated values
    21: 'INTEGER', // a signed big-endian integer with length one of { 1,2,3,4,8 } bytes
    24: 'RIAAPA', // RIAA parental advisory; { -1=no, 1=yes, 0=unspecified }, 8-bit ingteger
    25: 'UPC', // Universal Product Code, in text UTF-8 format (valid as an ID)
    27: 'BMP', // Windows bitmap image
    255: 'UNDEFINED' // undefined
  };

  var extractors = {
    readUInt: function readUInt(view, length) {
      return view.getUint32(0, false);
    },
    readText: function readText(view, length) {
      if (typeof Buffer === 'function') {
        return readString(view.buffer, length, 0);
      }
      else {
        return view.getString(length);
      }
    },
    readInt: function readInt(view, length) {
      return view.getInt32(0, false);
    },
    readByte: function readByte(view, length) {
      return view.getUint8(0, false);
    },
    readLongLong: function readLongLong(view, length) {
      return view.getUint32(0, false);
    },
    readBool: function readBool(view, length) {
      return view.byteLength ? view.buffer[0] != '\0' : false;
    },
    readIntPair: function readIntPair(view, length) {
      var a = new DataView(view.buffer.slice(2, 4)),
        b = new DataView(view.buffer.slice(4));

      return [a.getUint16(0, false), b.getUint16(0, false)];
    },
    readGenre: function readGenre(view, length) {
      var idx = view.getUint16(0, false);
      return Genres[idx];
    },
    readCover: function readCover(view, length, flags) {
      var buffer = new Buffer(view.byteLength),
        uview = new Uint8Array(view.buffer);

      for (var i = 0; i < buffer.length; i++) {
        buffer[i] = uview[i];
      }

      return {
        data: buffer,
        format: atom_data_types[flags]
      }
    }
  };

  var atom_name_mappings = {
    "title": "\251nam",
    "artist": "\251ART",
    "album": "\251alb",
    "comment": "\251cmt",
    "genre": "\251gen",
    "date": "\251day",
    "composer": "\251wrt",
    "grouping": "\251grp",
    "tracknumber": "trkn",
    "discnumber": "disk",
    "compilation": "cpil",
    "bpm": "tmpo",
    "copyright": "cprt",
    "lyrics": "\251lyr",
    "encodedby": "\251too",
    "albumsort": "soal",
    "albumartistsort": "soaa",
    "artistsort": "soar",
    "titlesort": "sonm",
    "composersort": "soco",
    "showsort": "sosn",
    "musicbrainz_trackid": "----:com.apple.iTunes:MusicBrainz Track Id",
    "musicbrainz_artistid": "----:com.apple.iTunes:MusicBrainz Artist Id",
    "musicbrainz_albumid": "----:com.apple.iTunes:MusicBrainz Album Id",
    "musicbrainz_albumartistid": "----:com.apple.iTunes:MusicBrainz Album Artist Id",
    "musicbrainz_releasegroupid": "----:com.apple.iTunes:MusicBrainz Release Group Id",
    "musicbrainz_workid": "----:com.apple.iTunes:MusicBrainz Work Id",
    "asin": "----:com.apple.iTunes:ASIN",
    "label": "----:com.apple.iTunes:LABEL",
    "lyricist": "----:com.apple.iTunes:LYRICIST",
    "conductor": "----:com.apple.iTunes:CONDUCTOR",
    "remixer": "----:com.apple.iTunes:REMIXER",
    "engineer": "----:com.apple.iTunes:ENGINEER",
    "producer": "----:com.apple.iTunes:PRODUCER",
    "djmixer": "----:com.apple.iTunes:DJMIXER",
    "mixer": "----:com.apple.iTunes:MIXER",
    "subtitle": "----:com.apple.iTunes:SUBTITLE",
    "discsubtitle": "----:com.apple.iTunes:DISCSUBTITLE",
    "mood": "----:com.apple.iTunes:MOOD",
    "isrc": "----:com.apple.iTunes:ISRC",
    "catalognumber": "----:com.apple.iTunes:CATALOGNUMBER",
    "barcode": "----:com.apple.iTunes:BARCODE",
    "script": "----:com.apple.iTunes:SCRIPT",
    "language": "----:com.apple.iTunes:LANGUAGE",
    "license": "----:com.apple.iTunes:LICENSE",
    "media": "----:com.apple.iTunes:MEDIA",

  };

  function translateToAtomName(human) {
    return atom_name_mappings[human];
  }

  function translateToHumanName(needle) {
    var match;
    for (var human in atom_name_mappings) {
      if (atom_name_mappings.hasOwnProperty(human)) {
        if (needle == atom_name_mappings[human]) {
          match = human;
          break;
        }
      }
    }
    return match;
  }

  /* Parsing */

  function parseDataBlock(view, offset, extractor, index) {
    var length = view.getUint32(offset, false),
      name = view.getString(4, offset + 4),
      flags = view.getUint32(offset + 8, false);
    var pad = (extractor.freeForm && index < 2) ? 12 : 16;
    var begin = offset + pad
    var end = begin + length - pad;
    var data = new DataView(view.buffer.slice(begin, end)),
      value = extractor(data, data.byteLength, flags),
      block = {};

    block.type = name;
    block.flags = flags;
    block.view = view;
    block.length = length;
    block.data = data;
    block.index = index;
    block.value = value;

    return block;
  }

  function parseDataBlocks(view, offset, extractor, index, blocks, end) {
    var block = parseDataBlock(view, offset, extractor, index);

    offset = offset + block.length;
    blocks.push(block);
    index++;
    if (offset < end) {
      return parseDataBlocks(view, offset, extractor, index, blocks, end);
    } else {
      return blocks;
    }
  }

  function extractorFor(atom) {
    var extractor;
    switch (atom.name) {
    case "tvsn":
    case "tves":
    case "cnID":

    case "sfID":
    case "atID":
    case "geID":
    case "cmID":
      extractor = extractors.readUInt;
      break;
    case "tmpo":
      extractor = extractors.readInt;
      break;
    case "stik":
    case "rtng":
    case "akID":
      extractor = extractors.readByte;
      break;
    case "plID":
      extractor = extractors.readLongLong;
      break;
    case "cpil":
    case "pgap":
    case "pcst":
    case "hdvd":
      extractor = extractors.readBool;
      break;
    case "trkn":
    case "disk":
      extractor = extractors.readIntPair;
      break;
    case "gnre":
      extractor = extractors.readGenre;
      break;
    case "covr":
      extractor = extractors.readCover;
      break;
    case "----":
      extractor = extractors.readText;
      extractor.freeForm = true;
      // Fallthru, no break to set default extractor here
    default:
      extractor = extractors.readText;
    }
    if (extractor.freeForm === undefined) {
      extractor.freeForm = false;
    }

    return extractor;
  }

  function extractBlocks(view, extractor) {
    var end = view.byteLength;

    return parseDataBlocks(view, 0, extractor, 0, [], end);
  }

  function readBlockData(atom, cb) {
    handle.read(atom.length - 8, atom.offset + 8, function (err, buffer) {
      if (err) {
        cb(err);
      } else {
        cb(null, buffer);
      }
    });
  }

  function readAllMetadata(atoms, props, meta, cb) {
    if (!cb) {
      cb = meta;
      meta = {};
    }

    var atom = atoms.shift();

    if (atom) {
      if (props.indexOf(atom.name) !== -1) {
        // read data from blocks
        readBlockData(atom, function (err, buffer) {
          if (err) {
            cb(err);
          } else {
            var blocks = extractBlocks(new DataView(buffer), extractorFor(atom));
            if (meta[atom.name]) {
              cb('duplicate atom,' + atom.name + ' aborting');
            } else {
              meta[atom.name] = blocks.length > 1 ? blocks : blocks[0];

              readAllMetadata(atoms, props, meta, cb);
            }
          }

        });
      } else {
        // ignore
        readAllMetadata(atoms, props, meta, cb);
      }
    } else {
      cb(null, meta);
    }

  }

  function readAtom(offset, cb) {
    handle.read(8, offset, function (err, buffer) {
      if (err) {
        cb(err);
      } else {
        if (buffer.byteLength < 8) {
          cb(null, {
            length: 0,
            offset: offset
          });
        }
        else {
          var dv = new DataView(buffer);
          var name = dv.getString(4, 4);

          var length = dv.getUint32(0, false);
          if (containers.indexOf(name) !== -1) {
            // parse child atoms
            if (name == 'meta') {
              offset += 4;
            } else if (name == 'stsd') {
              offset += 8;
            }

            readChildAtoms(offset + 8, offset + length, function (err, atoms) {
              if (err) {
                cb(err);
              } else {
                cb(null, {
                  name: name,
                  length: length,
                  offset: offset,
                  children: atoms
                });
              }
            })
          } else {
            cb(null, {
              name: name,
              length: length,
              offset: offset,
              children: []
            });
          }
        }
      }
    });
  }

  function readAtoms(offset, atoms, cb) {
    if (!cb) {
      cb = atoms;
      atoms = [];
    }

    readAtom(offset, function (err, atom) {
      if (err) {
        cb(err);
      } else {
        if (atom.length > 0) {
          atoms.push(atom);
          readAtoms(atom.offset + atom.length, atoms, cb);
        } else {
          cb(null, atoms);
        }
      }
    });

  }

  function readChildAtoms(offset, end, atoms, cb) {
    if (!cb) {
      cb = atoms;
      atoms = [];
    }

    readAtom(offset, function (err, atom) {
      if (err) {
        cb(err);
      } else {
        if (atom.length > 0 && offset < end) {
          atoms.push(atom);
          readChildAtoms(atom.offset + atom.length, end, atoms, cb);
        } else {
          cb(null, atoms);
        }
      }
    });
  }

  // lookup like this findAtom(atoms, ['moov','udta','meta'])

  function findAtom(atoms, keypath) {
    var level = keypath.shift();

    if (level) {
      var matches = atoms.filter(function (atom) {
        return (atom.name == level);
      });

      if (matches.length) {
        if (keypath.length > 0) {
          return findAtom(matches[0].children, keypath);
        } else {
          return matches[0];
        }
      } else {
        return;
      }
    } else {
      return;
    }
  }

  var field_names = [
    'title', 'date', 'artist', 'album', 'tracknumber', 'comment'
  ],
    atom_names = field_names.map(translateToAtomName);

  readAtoms(0, function (err, atoms) {
    if (!err) {
      var ilst = findAtom(atoms, ['moov', 'udta', 'meta', 'ilst']);
      readAllMetadata(ilst.children, atom_names, function (err, datum) {
        if (!err) {
          var tags = {};

          field_names.forEach(function (field, index) {
            var atom_name = translateToAtomName(field),
              block = datum[atom_name];

            if (block) {
              tags[field] = block.value;
            }

          });
          // decorate M4A tags
          tags.year = (new Date(Date.parse(tags.date)))
            .getUTCFullYear()

          tags.track = tags.tracknumber.join("/");
          callback(null, tags);
        } else {
          callback(err);
        }

      });
    } else {
      callback(err);
    }
  });
}/*
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
/*
 * Read the file
 */

  var handle = new Reader(options.type);

  handle.open(options.file, function (err) {
    if (err) {
      return cb('Could not open specified file');
    }
    MP4Tag.parse(handle, function (err, tags) {
      cb(err, tags);
    });
  });
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = mp4;
  } else {
    if (typeof define === 'function' && define.amd) {
      define('mp4', [], function () {
        return mp4;
      });
    } else {
      window.mp4 = mp4;
    }
  }
})();