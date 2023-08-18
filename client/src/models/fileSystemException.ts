import { XpException } from './xpException';

export class FileSystemException extends XpException {
	public constructor(message: string, path?: string, inner?: Error) {
		super(message, inner);
		this._path = path;
	}

	public getPath() : string {
		return this._path;
	}

	private _path: string;

	public static kbtToolNotFoundException(path: string) : FileSystemException {
		return new FileSystemException(
			`По пути [${path}](file:///${path}) не найдена необходимая утилита из Knowledge Base Toolkit (KBT). Проверьте корректность [пути к KBT](command:workbench.action.openSettings?["xpConfig.kbtBaseDirectory"]) или загрузите актуальную версию [отсюда](https://github.com/vxcontrol/xp-kbt/releases)`,
			path
		);
	}
}