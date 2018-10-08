var Reader = require('./reader');
var ID3Tag = require('./id3tag');

var id3 = function (opts, cb) {
  if (typeof require === 'function') {
    var fs = require('fs');
  }

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
      handle.close()
    });
  });
};

id3.OPEN_FILE = Reader.OPEN_FILE;
id3.OPEN_URI = Reader.OPEN_URI;
id3.OPEN_LOCAL = Reader.OPEN_LOCAL;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = id3;
} else {
  if (typeof define === 'function' && define.amd) {
    define('id3', [], function () {
      return id3;
    });
  } else {
    window.id3 = id3;
  }
}