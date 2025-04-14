export class XpException extends Error {
  public constructor(message: string, inner?: Error) {
    super(message);
    this._inner = inner;
  }

  public getInnerException(): Error {
    return this._inner;
  }

  private _inner: Error;
}
