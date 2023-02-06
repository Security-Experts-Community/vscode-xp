import { XpExtentionException } from './xpException';

export class FileNotFoundException extends XpExtentionException {
	public constructor(message: string, path?: string, inner?: Error) {
		super(message, inner);
		this._path = path;
	}

	public getPath() : string {
		return this._path;
	}

	private _path: string;
}