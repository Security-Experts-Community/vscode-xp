import * as fs from 'fs';

import { FileNotFoundException } from '../fileNotFounException';
import { XpException } from '../xpException';

export enum OsType {
	Windows,
	Linux,
	Mac
}

export abstract class PathLocator {
	constructor(kbFullPath: string) {
		this._kbFullPath = kbFullPath;
	}

	// Получение имён файлов в графами
	public abstract getNormalizationsGraphFileName() : string
	public abstract getEnrichmentsGraphFileName() : string
	public abstract getCorrelationsGraphFileName() : string
	public abstract getAgregationsGraphFileName() : string


	// KB
	public abstract getRulesDirFilters() : string
	public abstract getContentRoots() : string[]
	public abstract getPackages(): string[]
	public abstract isKbOpened() : boolean
	public abstract getRootByPath(directory: string): string
	public abstract getRequiredRootDirectories(): string[]
	public abstract getKbPath() : string

	protected checkKbPath() : void {
		if(!this._kbFullPath) {
			throw new XpException(`База знаний не открыта.`);
		}
	
		if(!fs.existsSync(this._kbFullPath)) {
			throw new FileNotFoundException(`Некорректный путь '${this._kbFullPath}'`, this._kbFullPath);
		}
	}

	protected getKbFullPath() : string {
		return this._kbFullPath;
	}

	private _kbFullPath: string
}