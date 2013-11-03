id3.js - Javascript ID3 tag parser
===

**id3.js** is a JavaScript library for reading and parsing ID3 tags of MP3 files. **id3.js** can parse both ID3v1 and ID3v2 tags within a browser or Node environment. It also supports reading from local files (Node-only), same-origin URLs (AJAX) and File instances (HTML5 File API).

AJAX
===

```html
<script src="id3.min.js"></script>
<script type="text/javascript">
id3('/audio/track.mp3', function(err, tags) {
	// tags now contains v1, v2 and merged tags
});
</script>
```

Here the MP3 is being requested by partial AJAX requests, such that only the ID3v1 and ID3v2 tags are read rather than the file as a whole.

Local Files
===

First, install **id3.js** using NPM, the Node package manager.

```
npm install id3js
```

Then use it like so:

```javascript
var id3 = require('id3js');

id3({ file: './track.mp3', type: id3.OPEN_LOCAL }, function(err, tags) {
	// tags now contains your ID3 tags
});
```

Note that here, the type is set to 'local' directly so that **id3.js** will attempt to read from the local file-system using `fs`.

This will **only work under NodeJS**.

File API (HTML5)
===

```html
<script src="id3.min.js"></script>
<script type="text/javascript">
document.querySelector('input[type="file"]').onchange = function(e) {
	id3(this.files[0], function(err, tags) {
		// tags now contains your ID3 tags
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
	"v1": {
		"title": "ID3v1 title",
		"artist": "ID3v1 artist",
		"album": "ID3v1 album",
		"year": "ID3v1 year",
		"comment": "ID3v1 comment",
		"track": "ID3v1 track (e.g. 02)",
		"version": 1.0
	},
	"v2": {
		"artist": "ID3v2 artist",
		"album": "ID3v2 album",
		"version": [4, 0]
	}
}
````

The `artist`, `title`, `album` and `year` properties will always exist, though they will default to null. These particular fields are filled by both ID3v1 and ID3v2, the latter taking the priority.

The `v2` object will contain a variable number of fields, depending on what is defined in the file, whereas the `v1` object will always have the same fields (some of which may be null).

Images
===

On occasion, an MP3 may have an image embedded in the ID3v2 tag. If this is the case, it will be available through `v2.image`. This has a structure like so:

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
