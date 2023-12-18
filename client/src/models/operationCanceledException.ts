import { XpException } from './xpException';

export class OperationCanceledException extends XpException {
	public constructor(message?: string, inner?: Error) {
		if(!message) {
			super("Операция отменена", inner);
		} else {
			super(message, inner);
		}
	}
}