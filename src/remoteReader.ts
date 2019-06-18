import {Reader} from './reader.js';

/**
 * Reads a remote URL
 */
export class RemoteReader extends Reader {
  protected _url: string;

  /**
   * @param {string} url URL to retrieve
   */
  public constructor(url: string) {
    super();

    this._url = url;
  }

  /** @inheritdoc */
  public async open(): Promise<void> {
    const resp = await fetch(this._url, {
      method: 'HEAD'
    });

    const contentLength = resp.headers.get('Content-Length');

    this.size = contentLength ? Number(contentLength) : 0;
  }

  /** @inheritdoc */
  public async read(length: number, position: number): Promise<ArrayBuffer> {
    const resp = await fetch(this._url, {
      method: 'GET',
      headers: {
        Range: `bytes=${position}-${position + length - 1}`
      }
    });

    return await resp.arrayBuffer();
  }
}
