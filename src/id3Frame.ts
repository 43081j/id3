import genres from './genres.js';
import {getString, getUint24, getUint32Synch, getStringUtf16} from './util.js';

export interface ID3Frame {
  tag: string | null;
  value: unknown | null;
  id: string | null;
}

export interface ImageValue {
  type: null | string;
  mime: null | string;
  description: null | string;
  data: null | ArrayBuffer;
}

export const types: ReadonlyMap<string, string> = new Map<string, string>([
  /*
   * Textual frames
   */
  ['TALB', 'album'],
  ['TBPM', 'bpm'],
  ['TCOM', 'composer'],
  ['TCON', 'genre'],
  ['TCOP', 'copyright'],
  ['TDEN', 'encoding-time'],
  ['TDLY', 'playlist-delay'],
  ['TDOR', 'original-release-time'],
  ['TDRC', 'recording-time'],
  ['TDRL', 'release-time'],
  ['TDTG', 'tagging-time'],
  ['TENC', 'encoder'],
  ['TEXT', 'writer'],
  ['TFLT', 'file-type'],
  ['TIPL', 'involved-people'],
  ['TIT1', 'content-group'],
  ['TIT2', 'title'],
  ['TIT3', 'subtitle'],
  ['TKEY', 'initial-key'],
  ['TLAN', 'language'],
  ['TLEN', 'length'],
  ['TMCL', 'credits'],
  ['TMED', 'media-type'],
  ['TMOO', 'mood'],
  ['TOAL', 'original-album'],
  ['TOFN', 'original-filename'],
  ['TOLY', 'original-writer'],
  ['TOPE', 'original-artist'],
  ['TOWN', 'owner'],
  ['TPE1', 'artist'],
  ['TPE2', 'band'],
  ['TPE3', 'conductor'],
  ['TPE4', 'remixer'],
  ['TPOS', 'set-part'],
  ['TPRO', 'produced-notice'],
  ['TPUB', 'publisher'],
  ['TRCK', 'track'],
  ['TRSN', 'radio-name'],
  ['TRSO', 'radio-owner'],
  ['TSOA', 'album-sort'],
  ['TSOP', 'performer-sort'],
  ['TSOT', 'title-sort'],
  ['TSRC', 'isrc'],
  ['TSSE', 'encoder-settings'],
  ['TSST', 'set-subtitle'],
  ['TYER', 'year'],
  /*
   * Textual frames (<=2.2)
   */
  ['TAL', 'album'],
  ['TBP', 'bpm'],
  ['TCM', 'composer'],
  ['TCO', 'genre'],
  ['TCR', 'copyright'],
  ['TDY', 'playlist-delay'],
  ['TEN', 'encoder'],
  ['TFT', 'file-type'],
  ['TKE', 'initial-key'],
  ['TLA', 'language'],
  ['TLE', 'length'],
  ['TMT', 'media-type'],
  ['TOA', 'original-artist'],
  ['TOF', 'original-filename'],
  ['TOL', 'original-writer'],
  ['TOT', 'original-album'],
  ['TP1', 'artist'],
  ['TP2', 'band'],
  ['TP3', 'conductor'],
  ['TP4', 'remixer'],
  ['TPA', 'set-part'],
  ['TPB', 'publisher'],
  ['TRC', 'isrc'],
  ['TRK', 'track'],
  ['TSS', 'encoder-settings'],
  ['TT1', 'content-group'],
  ['TT2', 'title'],
  ['TT3', 'subtitle'],
  ['TXT', 'writer'],
  ['TYE', 'year'],
  /*
   * URL frames
   */
  ['WCOM', 'url-commercial'],
  ['WCOP', 'url-legal'],
  ['WOAF', 'url-file'],
  ['WOAR', 'url-artist'],
  ['WOAS', 'url-source'],
  ['WORS', 'url-radio'],
  ['WPAY', 'url-payment'],
  ['WPUB', 'url-publisher'],
  /*
   * URL frames (<=2.2)
   */
  ['WAF', 'url-file'],
  ['WAR', 'url-artist'],
  ['WAS', 'url-source'],
  ['WCM', 'url-commercial'],
  ['WCP', 'url-copyright'],
  ['WPB', 'url-publisher'],
  /*
   * Comment frame
   */
  ['COMM', 'comments'],
  /*
   * Image frame
   */
  ['APIC', 'image'],
  ['PIC', 'image'],
  /*
   * Private frames
   */
  ['PRIV', 'private']
]);

export const imageTypes = [
  'other',
  'file-icon',
  'icon',
  'cover-front',
  'cover-back',
  'leaflet',
  'media',
  'artist-lead',
  'artist',
  'conductor',
  'band',
  'composer',
  'writer',
  'location',
  'during-recording',
  'during-performance',
  'screen',
  'fish',
  'illustration',
  'logo-band',
  'logo-publisher'
];

/**
 * Parses legacy frames for ID3 v2.2 and earlier
 * @param {ArrayBuffer} buffer Buffer to read
 * @return {ID3Frame|null}
 */
export function parseLegacy(buffer: ArrayBuffer): ID3Frame | null {
  const result: ID3Frame = {
    id: null,
    tag: null,
    value: null
  };
  const dv = new DataView(buffer);
  const header = {
    id: getString(dv, 3),
    type: getString(dv, 1),
    size: getUint24(dv, 3)
  };

  const matchedType = types.get(header.id);

  if (!matchedType) {
    return null;
  }

  result.id = header.id;
  result.tag = matchedType;

  if (header.type === 'T') {
    /*
     * TODO: Implement UTF-8, UTF-16 and UTF-16 with BOM properly?
     */
    let val = getString(dv, -7, 7);

    if (header.id === 'TCO' && !!parseInt(val)) {
      val = genres[parseInt(val)];
    }

    result.value = val;
  } else if (header.type === 'W') {
    result.value = getString(dv, -7, 7);
  } else if (header.id === 'COM') {
    /*
     * TODO: Implement UTF-8, UTF-16 and UTF-16 with BOM properly?
     */
    let val = getString(dv, -10, 10);

    if (val.indexOf('\x00') !== -1) {
      val = val.substr(val.indexOf('\x00') + 1);
    }

    result.value = val;
  } else if (header.id === 'PIC') {
    const image: ImageValue = {
      type: null,
      mime: 'image/' + getString(dv, 3, 7).toLowerCase(),
      description: null,
      data: null
    };

    image.type = imageTypes[dv.getUint8(11)] || 'other';

    const variableStart = 11;
    let variableLength = 0;

    for (let i = variableStart; ; i++) {
      if (dv.getUint8(i) === 0x00) {
        variableLength = i - variableStart;
        break;
      }
    }

    image.description =
      variableLength === 0
        ? null
        : getString(dv, variableLength, variableStart);
    image.data = buffer.slice(variableStart + 1);

    result.value = image;
  }

  return result.tag ? result : null;
}

/**
 * Parses a given buffer into an ID3 frame
 * @param {ArrayBuffer} buffer Buffer to read data from
 * @param {number} major Major version of ID3
 * @param {number} minor Minor version of ID3
 * @return {ID3Frame|null}
 */
export function parse(
  buffer: ArrayBuffer,
  major: number,
  minor: number
): ID3Frame | null {
  minor = minor || 0;
  major = major || 4;

  const result: ID3Frame = {id: null, tag: null, value: null};
  const dv = new DataView(buffer);

  if (major < 3) {
    return parseLegacy(buffer);
  }

  const header = {
    id: getString(dv, 4),
    type: getString(dv, 1),
    size: getUint32Synch(dv, 4),
    flags: [dv.getUint8(8), dv.getUint8(9)]
  };

  /*
   * No support for compressed, unsychronised, etc frames
   */
  if (header.flags[1] !== 0) {
    return null;
  }

  const matchedType = types.get(header.id);

  if (!matchedType) {
    return null;
  }

  result.tag = matchedType;
  result.id = header.id;

  if (header.type === 'T') {
    const encoding = dv.getUint8(10);
    let val: string | null = null;

    /*
     * TODO: Implement UTF-8, UTF-16 and UTF-16 with BOM properly?
     */
    if (encoding === 0 || encoding === 3) {
      val = getString(dv, -11, 11);
    } else if (encoding === 1) {
      val = getStringUtf16(dv, -11, 11, true);
    } else if (encoding === 2) {
      val = getStringUtf16(dv, -11, 11);
    }

    if (header.id === 'TCON' && val !== null && !!parseInt(val)) {
      val = genres[parseInt(val)];
    }

    result.value = val;
  } else if (header.type === 'W') {
    result.value = getString(dv, -10, 10);
  } else if (header.id === 'PRIV') {
    const variableStart = 10;
    let variableLength = 0;

    for (let i = 0; ; i++) {
      if (dv.getUint8(i) === 0x00) {
        variableLength = i - variableStart;
        break;
      }
    }

    result.value = {
      identifier:
        variableLength === 0
          ? null
          : getString(dv, variableLength, variableStart),
      data: buffer.slice(variableLength + variableStart + 1)
    };
  } else if (header.id === 'COMM') {
    /*
     * TODO: Implement UTF-8, UTF-16 and UTF-16 with BOM properly?
     */
    const encoding = dv.getUint8(10);
    let variableStart = 14;

    /*
     * Skip the comment description and retrieve only the comment its self
     */
    for (let i = variableStart; ; i++) {
      if (encoding === 1 || encoding === 2) {
        if (dv.getUint16(i) === 0x0000) {
          variableStart = i + 2;
          break;
        }
        i++;
      } else {
        if (dv.getUint8(i) === 0x00) {
          variableStart = i + 1;
          break;
        }
      }
    }

    if (encoding === 0 || encoding === 3) {
      result.value = getString(dv, -1 * variableStart, variableStart);
    } else if (encoding === 1) {
      result.value = getStringUtf16(
        dv,
        -1 * variableStart,
        variableStart,
        true
      );
    } else if (encoding === 2) {
      result.value = getStringUtf16(dv, -1 * variableStart, variableStart);
    }
  } else if (header.id === 'APIC') {
    const encoding = dv.getUint8(10);
    const image: ImageValue = {
      type: null,
      mime: null,
      description: null,
      data: null
    };
    let variableStart = 11;
    let variableLength = 0;

    for (let i = variableStart; ; i++) {
      if (dv.getUint8(i) === 0x00) {
        variableLength = i - variableStart;
        break;
      }
    }

    image.mime = getString(dv, variableLength, variableStart);
    image.type =
      imageTypes[dv.getUint8(variableStart + variableLength + 1)] || 'other';
    variableStart += variableLength + 2;
    variableLength = 0;

    for (let i = variableStart; ; i++) {
      if (dv.getUint8(i) === 0x00) {
        variableLength = i - variableStart;
        break;
      }
    }

    if (variableLength !== 0) {
      if (encoding === 0 || encoding === 3) {
        image.description = getString(dv, variableLength, variableStart);
      } else if (encoding === 1) {
        image.description = getStringUtf16(
          dv,
          variableLength,
          variableStart,
          true
        );
      } else if (encoding === 2) {
        image.description = getStringUtf16(dv, variableLength, variableStart);
      }
    }

    image.data = buffer.slice(variableStart + 1);

    result.value = image;
  }

  return result.tag ? result : null;
}
