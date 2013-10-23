id3.js - Javascript ID3 tag parser for Node & Browsers
===

**id3.js** is a JavaScript library for reading and parsing ID3 tags of MP3 files. **id3.js** can parse both ID3v1 and ID3v2 tags within a browser or Node environment. It also supports reading from local files (Node-only), same-origin URLs (AJAX) and File instances (HTML5 File API).

Example - AJAX
===

```html
<script src="id3.js"></script>
```

```javascript
id3('/audio/track.mp3', function(err, tags) {
	// tags now contains v1, v2 and merged tags
});
```

Example - NodeJS
===

```javascript
var id3 = require('./id3');

id3({ file: './track.mp3', type: 'local' }, function(err, tags) {
	// tags now contains your ID3 tags
});
```

Note that here, the type is set to 'local' directly so that **id3.js** will attempt to read from the local file-system using `fs`.

Example - File API (HTML5)
===

```html
<script src="id3.js"></script>
```

```javascript
document.querySelector('input[type="file"]').onchange = function(e) {
	id3(this.files[0], function(err, tags) {
		// tags now contains your ID3 tags
	});
}
```

Tags format
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

License
===

MIT
