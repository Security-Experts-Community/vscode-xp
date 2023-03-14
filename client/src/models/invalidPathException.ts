import { XpException } from './xpException';

export class InvalidPathException extends XpException {
	public constructor(message: string, inner?: Error) {
		super(message, inner);
	}
}