import { XpException } from './xpException';

export class ParseException extends XpException {
  public constructor(message: string, inner?: Error) {
    super(message, inner);
  }
}
