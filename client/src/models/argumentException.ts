import { XpException } from './xpException';

export class ArgumentException extends XpException {
	public constructor(message: string, inner?: Error) {
		super(message, inner);
	}
}