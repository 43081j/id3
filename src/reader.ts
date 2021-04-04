/**
 * Provides read access to a given resource
 */
export abstract class Reader {
  /**
   * Size of the resource
   */
  public size: number = 0;

  /**
   * Opens the resource for reading
   * @return {Promise<void>}
   */
  public abstract open(): Promise<void>;

  /**
   * Closes the resource
   * @return {Promise<void>}
   */
  public async close(): Promise<void> {
    return;
  }

  /**
   * Reads a specified range of the resource
   * @param {number} length Number of bytes to read
   * @param {number} position Position to begin from
   * @return {Promise<ArrayBuffer>}
   */
  public abstract read(length: number, position: number): Promise<ArrayBuffer>;

  /**
   * Reads a specified range into a Blob
   * @param {number} length Number of bytes to read
   * @param {number} position Position to begin from
   * @param {string=} type Type of data to return
   * @return {Promise<Blob>}
   */
  public async readBlob(
    length: number,
    position: number = 0,
    type: string = 'application/octet-stream'
  ): Promise<Blob> {
    const data = await this.read(length, position);
    return new Blob([data], {type: type});
  }
}
