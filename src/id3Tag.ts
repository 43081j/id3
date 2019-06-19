import {Reader} from './reader.js';
import {parse as parseFrame, ID3Frame, ImageValue} from './id3Frame.js';
import {getString, getUint32Synch, getUint24} from './util.js';
import genres from './genres.js';

export interface ID3Tag {
  title: string | null;
  album: string | null;
  artist: string | null;
  year: string | null;
  [key: string]: unknown;
}

export interface ID3TagV1 extends ID3Tag {
  kind: 'v1';
  comment: string | null;
  track: string | null;
  genre: string | null;
  version: number;
}

export interface ID3TagV2 extends ID3Tag {
  kind: 'v2';
  version: [number, number];
  frames: ID3Frame[];
  images: ImageValue[];
}

/**
 * Parses a given resource into an ID3 tag
 * @param {Reader} handle Reader to use for reading the resource
 * @return {Promise<ID3Tag|null>}
 */
export async function parse(handle: Reader): Promise<ID3Tag | null> {
  let tag: ID3Tag | null = null;

  /*
   * Read the last 128 bytes (ID3v1)
   */
  const v1HeaderBuf = await handle.read(128, handle.size - 128);
  const v1Header = new DataView(v1HeaderBuf);

  if (
    v1HeaderBuf.byteLength === 128 &&
    getString(v1Header, 3, undefined, true) === 'TAG'
  ) {
    tag = {
      kind: 'v1',
      title: getString(v1Header, 30, 3).trim() || null,
      album: getString(v1Header, 30, 63).trim() || null,
      artist: getString(v1Header, 30, 33).trim() || null,
      year: getString(v1Header, 4, 93).trim() || null,
      genre: null,
      comment: null,
      track: null
    };

    /*
     * If there is a zero byte at [125], the comment is 28 bytes and the
     * remaining 2 are [0, trackno]
     */
    if (v1Header.getUint8(125) === 0) {
      tag.comment = getString(v1Header, 28, 97);
      tag.version = 1.1;
      tag.track = v1Header.getUint8(126);
    } else {
      tag.comment = getString(v1Header, 30, 97);
    }

    /*
     * Lookup the genre index in the predefined genres array
     */
    tag.genre = genres[v1Header.getUint8(127)] || null;
  }

  /*
   * Read 14 bytes (10 for ID3v2 header, 4 for possible extended header size)
   * Assuming the ID3v2 tag is prepended
   */
  const v2PrefixBuf = await handle.read(14, 0);
  const v2Prefix = new DataView(v2PrefixBuf);

  /*
   * Be sure that the buffer is at least the size of an id3v2 header
   * Assume incompatibility if a major version of > 4 is used
   */
  if (
    v2PrefixBuf.byteLength === 14 &&
    getString(v2Prefix, 3, undefined, true) === 'ID3' &&
    v2Prefix.getUint8(3) <= 4
  ) {
    let headerSize = 10;
    let tagSize = 0;
    const version = [v2Prefix.getUint8(3), v2Prefix.getUint8(4)];
    const tagFlags = v2Prefix.getUint8(5);

    /*
     * Do not support unsynchronisation
     */
    if ((tagFlags & 0x80) === 0) {
      tag = {
        kind: 'v2',
        title: tag ? tag.title : null,
        album: tag ? tag.album : null,
        artist: tag ? tag.artist : null,
        year: tag ? tag.year : null,
        version: version,
        frames: [],
        images: []
      };

      /*
       * Increment the header size to offset by if an extended header exists
       */
      if ((tagFlags & 0x40) !== 0) {
        headerSize += getUint32Synch(v2Prefix, 11);
      }

      /*
       * Calculate the tag size to be read
       */
      tagSize += getUint32Synch(v2Prefix, 6);

      const v2TagBuf = await handle.read(tagSize, headerSize);
      const v2Tag = new DataView(v2TagBuf);
      let position = 0;

      while (position < v2TagBuf.byteLength) {
        let slice;
        let isFrame = true;

        for (let i = 0; i < 3; i++) {
          const frameBit = v2Tag.getUint8(position + i);

          if (
            (frameBit < 0x41 || frameBit > 0x5a) &&
            (frameBit < 0x30 || frameBit > 0x39)
          ) {
            isFrame = false;
          }
        }

        if (!isFrame) {
          break;
        }

        /*
         * < v2.3, frame ID is 3 chars, size is 3 bytes making a total
         * size of 6 bytes.
         * >= v2.3, frame ID is 4 chars, size is 4 bytes, flags are 2 bytes,
         * total 10 bytes.
         */
        if (version[0] < 3) {
          slice = v2TagBuf.slice(
            position,
            position + 6 + getUint24(v2Tag, position + 3)
          );
        } else if (version[0] === 3) {
          slice = v2TagBuf.slice(
            position,
            position + 10 + v2Tag.getUint32(position + 4)
          );
        } else {
          slice = v2TagBuf.slice(
            position,
            position + 10 + getUint32Synch(v2Tag, position + 4)
          );
        }

        const frame = await parseFrame(slice, version[0], version[1]);

        if (frame && frame.tag) {
          const tagAsV2 = tag as ID3TagV2;

          tagAsV2.frames.push(frame);

          if (frame.tag === 'image') {
            tagAsV2.images.push(frame.value as ImageValue);
          } else {
            tag[frame.tag] = frame.value;
          }
        }

        position += slice.byteLength;
      }
    }
  }

  return tag;
}
