/**
 * Retrieves a string from a specific offset of a data view
 * @param {DataView} view View to retrieve string from
 * @param {number|null} length Bytes to read
 * @param {number=} offset Offset to read from
 * @param {boolean=} raw Whether to return the raw string or not
 * @return {string}
 */
export function getString(
  view: DataView,
  length: number | undefined,
  offset: number = 0,
  raw?: boolean
): string {
  let len = length || view.byteLength - offset;
  const useBuffer = typeof Buffer !== 'undefined';

  if (len < 0) {
    len += view.byteLength;
  }

  const data: number[] = [];
  const limit = offset + len;

  for (let i = offset; i < limit; i++) {
    const current = view.getUint8(i);
    if (current === 0) {
      break;
    }
    data.push(current);
  }

  if (useBuffer) {
    return Buffer.from(data).toString();
  }

  const str = data.map((chr) => String.fromCharCode(chr)).join('');

  if (raw) {
    return str;
  }

  return decodeURIComponent(escape(str));
}

/**
 * Retrieves a UTF16 string from a specific offset of a data view
 * @param {DataView} view View to retrieve string from
 * @param {number|null} length Bytes to read
 * @param {number=} offset Offset to read from
 * @param {boolean=} bom Whether to use BOM or not
 * @return {string}
 */
export function getStringUtf16(
  view: DataView,
  length: number | null,
  offset: number = 0,
  bom?: boolean
): string {
  let littleEndian = false;
  let len = length || view.byteLength - offset;
  const str: number[] = [];
  const useBuffer = typeof Buffer !== 'undefined';

  if (len < 0) {
    len += view.byteLength;
  }

  if (offset + 1 > view.byteLength) {
    return '';
  }

  if (bom) {
    const bomInt = view.getUint16(offset);

    if (bomInt === 0xfffe) {
      littleEndian = true;
    }

    offset += 2;
    len -= 2;
  }

  const limit = offset + len;

  for (let i = offset; i < limit; i += 2) {
    let ch = view.getUint16(i, littleEndian);

    if (
      i < limit - 1 &&
      ch === 0 &&
      view.getUint16(i + 1, littleEndian) === 0
    ) {
      break;
    }

    if ((ch >= 0 && ch <= 0xd7ff) || (ch >= 0xe000 && ch <= 0xffff)) {
      str.push(ch);
    } else if (ch >= 0x10000 && ch <= 0x10ffff) {
      ch -= 0x10000;

      str.push(((0xffc00 & ch) >> 10) + 0xd800);
      str.push((0x3ff & ch) + 0xdc00);
    }
  }

  if (useBuffer) {
    const buf = Buffer.alloc(str.length * 2);
    for (let i = 0; i < str.length; i++) {
      const chr = str[i];

      if (littleEndian) {
        buf.writeUInt16LE(chr, i * 2);
      } else {
        buf.writeUInt16BE(chr, i * 2);
      }
    }
    return buf.toString();
  }

  return String.fromCharCode.apply(
    null,
    (new Uint16Array(str) as unknown) as number[]
  );
}

/**
 * Gets the "synch" representation of a number
 * @param {number} num Number to convert
 * @return {number}
 */
export function getSynch(num: number): number {
  let out = 0;
  let mask = 0x7f000000;

  while (mask) {
    out >>= 1;
    out |= num & mask;
    mask >>= 8;
  }

  return out;
}

/**
 * Gets a "synch2 uint8 from a view
 * @param {DataView} view View to read
 * @param {number=} offset Offset to read from
 * @return {number}
 */
export function getUint8Synch(view: DataView, offset: number = 0): number {
  return getSynch(view.getUint8(offset));
}

/**
 * Gets a "synch2 uint32 from a view
 * @param {DataView} view View to read
 * @param {number=} offset Offset to read from
 * @return {number}
 */
export function getUint32Synch(view: DataView, offset: number = 0): number {
  return getSynch(view.getUint32(offset));
}

/**
 * Gets a uint24 from a view
 * @param {DataView} view View to read
 * @param {number=} offset Offset to read from
 * @param {boolean=} littleEndian Whether to use little endian or not
 * @return {number}
 */
export function getUint24(
  view: DataView,
  offset: number = 0,
  littleEndian?: boolean
): number {
  if (littleEndian) {
    return (
      view.getUint8(offset) +
      (view.getUint8(offset + 1) << 8) +
      (view.getUint8(offset + 2) << 16)
    );
  }
  return (
    view.getUint8(offset + 2) +
    (view.getUint8(offset + 1) << 8) +
    (view.getUint8(offset) << 16)
  );
}
