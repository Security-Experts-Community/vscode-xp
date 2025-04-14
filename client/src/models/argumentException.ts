import { XpException } from './xpException';

export class ArgumentException extends XpException {
  public constructor(message: string, paramName?: string, inner?: Error) {
    super(message, inner);
    this._paramName = paramName;
  }

  public getParamName(): string {
    return this._paramName;
  }

  private _paramName: string;
}
