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