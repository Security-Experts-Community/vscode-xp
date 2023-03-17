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

	// Config
	// Пока не убрали отличие в именах файлов графов корреляций
	// оставляем эти функции
	public abstract getCorrulesGraphFileName() : string

	// KB
	public abstract getAppendixPath() : string
	public abstract getTablesContract() : string
	public abstract getRulesDirFilters() : string
	public abstract getContentRoots() : string[]
	public abstract getPackages(): string[]
	public abstract isKbOpened() : boolean
	public abstract getRootByPath(directory: string): string
	public abstract getOutputDirName(): string

	protected checkKbPath() : void {
		if(!this._kbFullPath) {
			throw new XpException(`База знаний не открыта.`);
		}
	
		if(!fs.existsSync(this._kbFullPath)) {
			throw new FileNotFoundException(`Некорректный путь '${this._kbFullPath}'`, this._kbFullPath);
		}
	}

	public getKbFullPath() : string {
		return this._kbFullPath;
	}

	private _kbFullPath: string
}