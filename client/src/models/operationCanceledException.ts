import { XpException } from './xpException';

export class OperationCanceledException extends XpException {
  public constructor(message: string, inner?: Error) {
    if (!message) {
      super(message, inner);
    } else {
      super(message, inner);
    }
  }
}
