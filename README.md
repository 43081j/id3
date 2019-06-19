## id3.js - Javascript ID3 tag parser

**id3.js** is a JavaScript library for reading and parsing ID3 tags of MP3
files.

It can parse both ID3v1 and ID3v2 tags within a browser or within Node.

Files can be read from the local disk (Node only), same-origin URLs
and `File` instances (HTML5 File API).

## Usage

Install:

```
$ npm i -S id3js
```

### AJAX

You may parse ID3 tags of a remote MP3 by URL:

```html
<script type="module">
import * as id3 from '//unpkg.com/id3js@^2/lib/id3.js';

id3.fromUrl('/audio/track.mp3').then((tags) => {
  // tags now contains v1, v2 and merged tags
});
</script>
```

This works by sending a `HEAD` request for the file and, based on the response,
sending subsequent `Range` requests for the ID3 tags.

This is rather efficient as there is no need for the entire file to be
downloaded.

### Local Files

You may parse ID3 tags of a local file in Node:

```ts
import * as id3 from 'id3js';

id3.fromPath('./test.mp3').then((tags) => {
  // tags now contains v1, v2 and merged tags
});
```

**Keep in mind, Node must be run with `--experimental-modules`
for this to be imported and it cannot be used with `require`.**

### File inputs (HTML5)

You may parse ID3 tags of a file input:

```html
<input type="file">

<script type="module">
import * as id3 from '//unpkg.com/id3js@^2/lib/id3.js';

document
  .querySelector('input[type="file"]')
  .addEventListener('change', async (e) => {
    const tags = await id3.fromFile(e.currentTarget.files[0]);
    // tags now contains v1, v2 and merged tags
  });
</script>
```

This will read the data from the File instance using slices,
so the entire file is not loaded into memory but rather only the tags.

## Images

An MP3 may have images embedded in the ID3 tags. If this is the case,
they can be accessed through the `tag.images` property and will
look like so:

```json
{
  "type": "cover-front",
  "mime": "image/jpeg",
  "description": null,
  "data": ArrayBuffer
}
```

As you can see, the data is provided as an `ArrayBuffer`.
To access it, you may use a `DataView` or typed array such
as `Uint8Array`.

## License

MIT
