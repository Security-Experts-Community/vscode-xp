import { XpExtentionException } from '../models/xpException';

export class IncorrectFieldFillingException extends XpExtentionException {
	public constructor(message: string, innerException?: Error) {
		super(message, innerException);
	}
}