import { XpException } from './xpException';

export class FileNotFoundException extends XpException {
	public constructor(message: string, path?: string, inner?: Error) {
		super(message, inner);
		this._path = path;
	}

	public getPath() : string {
		return this._path;
	}

	private _path: string;
}