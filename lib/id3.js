/*
 * ID3 (v1/v2) Parser
 * 43081j
 * License: MIT, see LICENSE
 */

(function() {

  var id3 = function(opts, cb) {
    /*
    * Initialise ID3
    */
    var options = {
      type: Reader.OPEN_URI,
    };
    if(typeof window !== 'undefined' && window.File && opts instanceof window.File) {
      opts = {file: opts, type: Reader.OPEN_FILE};
    } else if(typeof opts === 'string') {
      opts = {file: opts, type: Reader.OPEN_URI};
    }
    for(var k in opts) {
      options[k] = opts[k];
    }

    if(!options.file) {
      return cb('No file was set');
    }

    if(options.type === Reader.OPEN_FILE) {
      if(typeof window === 'undefined' || !window.File || !window.FileReader || typeof ArrayBuffer === 'undefined') {
        return cb('Browser does not have support for the File API and/or ArrayBuffers');
      }
    } else if(options.type === Reader.OPEN_LOCAL) {
      if(typeof require !== 'function') {
        return cb('Local paths may not be read within a browser');
      }
    } else {
    }

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