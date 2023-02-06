import { XpExtentionException } from './xpException';

export class ParseException extends XpExtentionException {
	public constructor(message: string, inner?: Error) {
		super(message, inner);
	}
}