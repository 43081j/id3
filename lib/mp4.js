/* Buffer Utitlities */

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
}