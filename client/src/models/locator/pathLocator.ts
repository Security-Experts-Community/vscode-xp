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
		this.KbFullPath = kbFullPath;
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

	protected checkKbPath() : void {
		if(!this.KbFullPath) {
			throw new XpException(`База знаний не открыта.`);
		}
	
		if(!fs.existsSync(this.KbFullPath)) {
			throw new FileNotFoundException(`Некорректный путь '${this.KbFullPath}'`, this.KbFullPath);
		}
	}

	protected KbFullPath: string
}