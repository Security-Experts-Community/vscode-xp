import { XpExtentionException } from './xpException';

export class ArgumentException extends XpExtentionException {
	public constructor(message: string, inner?: Error) {
		super(message, inner);
	}
}