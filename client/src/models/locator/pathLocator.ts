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
	// public abstract getAppendixPath() : string
	// public abstract getTablesContract() : string
	public abstract getRulesDirFilters() : string
	public abstract getContentRoots() : string[]
	public abstract getPackages(): string[]
	public abstract isKbOpened() : boolean
	public abstract getRootByPath(directory: string): string
	//public abstract getOutputDirName(): string
	public abstract getRequiredRootDirectories(): string[]

	// protected getAppendixPath() : string {
	// 	this.checkKbPath();
	// 	const relative_path = path.join(this._config.getKbtBaseDirectory(), "knowledgebase", "contracts", "xp_appendix", "appendix.xp");
	// 	return path.join(this.getKbFullPath(), relative_path);
	// }

	// protected getTablesContract() : string {
	// 	this.checkKbPath();
	// 	const relative_path = path.join(this._config.getKbtBaseDirectory(), "knowledgebase", "contracts", "tabular_lists", "tables_contract.yaml");
	// 	return path.join(this.getKbFullPath(), relative_path);
	// }

	// public getRulesDirFilters() : string {
	// 	this.checkKbPath();
	// 	const relative_path = path.join("common", "rules_filters");
	// 	return path.join(this.getKbFullPath(), relative_path);
	// }

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