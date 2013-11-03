mp4.js - Javascript MP4 tag parser
===

**mp4.js** is a JavaScript library for reading and parsing metatags of MP4 files (m4a,m4v,ALAC). **mp4.js** can parse metadata within a browser or Node environment. It also supports reading from local files (Node-only), same-origin URLs (AJAX) and File instances (HTML5 File API).

Compatibility for AJAX/FileReaderAPI and nodejs is taken from [https://github.com/43081j/id3](43081j's ID3.js), 
implementation details are based upon the magnificent [taglib](https://github.com/taglib/taglib), thanks for that!

AJAX
===

```html
<script src="mp4.min.js"></script>
<script type="text/javascript">
mp4('/audio/track.m4a', function(err, tags) {
	// tags now contains tags
});
</script>
```

Here the MP4 is being requested by partial AJAX requests, such that only the metatags are read rather than the file as a whole.

Local Files
===

First, install **mp4.js** using NPM, the Node package manager.

```
npm install mp4js
```

Then use it like so:

```javascript
var mp4 = require('mp4js');

mp4({ file: './track.m4a', type: 'local' }, function(err, tags) {
	// tags now contains your MP4 tags
});
```

Note that here, the type is set to 'local' directly so that **mp4.js** will attempt to read from the local file-system using `fs`.

This will **only work under NodeJS**.

File API (HTML5)
===

```html
<script src="mp4.min.js"></script>
<script type="text/javascript">
document.querySelector('input[type="file"]').onchange = function(e) {
	mp4(this.files[0], function(err, tags) {
		// tags now contains your MP4 tags
	});
}
</script>
```

This will read the data from the File instance using slices, so the entire file is not loaded into memory but rather only the tags.

Format
===

Tags are passed as an object of the following format:

```json
{
	"artist": "Song artist",
	"title": "Song name",
	"album": "Song album",
	"year": "2013",
	"date": "2013-01-10T20:20:10Z",
	"tracknumber": [2, 18]
	"track": "2/18"
}
````

The `artist`, `title`, `album` and `year` properties will always exist, though they will default to null.


Images
===

On occasion, an MP4 may have an image embedded in the metatag. If this is the case, it will be available through `cover`. This has a structure like so:

__FIXME__ (the API does not pass the MP4 cover through yet, but parsing of covers is ready)
```json
{
	"type": "cover-front",
	"mime": "image/jpeg",
	"description": null,
	"data": ArrayBuffer
}
```

As you can see, the data is provided as an `ArrayBuffer`. To access it, you may use a `DataView` or typed array such as `Uint8Array`.

License
===

MIT
