import { XpException } from './xpException';

export class OperationCanceledException extends XpException {
	public constructor(message: string, inner?: Error) {
		super(message, inner);
	}
}