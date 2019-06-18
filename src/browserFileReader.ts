import {Reader} from './reader.js';

/**
 * Reads a `File` instance
 */
export class BrowserFileReader extends Reader {
  protected _file: File;

  /**
   * @param {File} file File to read
   */
  public constructor(file: File) {
    super();

    this._file = file;
  }

  /** @inheritdoc */
  public async open(): Promise<void> {
    this.size = this._file.size;
  }

  /** @inheritdoc */
  public async read(length: number, position: number): Promise<ArrayBuffer> {
    const slice = this._file.slice(position, position + length);

    return new Promise((resolve, reject) => {
      const fr = new FileReader();

      fr.onload = () => {
        resolve(fr.result as ArrayBuffer);
      };

      fr.onerror = () => {
        reject(new Error('File read failed'));
      };

      fr.readAsArrayBuffer(slice);
    });
  }
}
