import { XpException } from '../models/xpException';

export class IncorrectFieldFillingException extends XpException {
  public constructor(message: string, innerException?: Error) {
    super(message, innerException);
  }
}
