import { XpExtentionException } from './xpException';

export class InvalidPathException extends XpExtentionException {
	public constructor(message: string, inner?: Error) {
		super(message, inner);
	}
}