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
      } else {}