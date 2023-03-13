import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { PathLocator } from './pathLocator';
import { XpExtentionException } from '../xpException';


export class EDRPathHelper extends PathLocator {

	private constructor(kbFullPath: string) {
		super(kbFullPath);
	}
	
	private _prefix = path.join("resources", "build-resources");
	private static _instance: EDRPathHelper;

	public static get() : EDRPathHelper {
		const kbFullPath =
		(vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;

		if (!EDRPathHelper._instance){
			EDRPathHelper._instance = new EDRPathHelper(kbFullPath);
		}
		return EDRPathHelper._instance;
	}

	public getOutputDirName(): string {
		throw new XpExtentionException("Данная функция не поддерживается.");
	}

	public getRootByPath(directory: string): string{
		if (!directory){
			return "";
		}
		const pathEntities = directory.split(path.sep);
		const roots = this.getContentRoots().map(folder => {return path.basename(folder);});
		for (const root of roots){
			const  packagesDirectoryIndex = pathEntities.findIndex( pe => pe.toLocaleLowerCase() === root);
			if(packagesDirectoryIndex === -1){
				continue;
			}

			// Удаляем лишние элементы пути и собираем результирующий путь.
			pathEntities.splice(packagesDirectoryIndex + 1);
			const packageDirectoryPath = pathEntities.join(path.sep);
			return packageDirectoryPath;
		}

		throw new Error(`Путь '${directory}' не содержит ни одну из корневых директорий: [${roots.join(", ")}].`);
	}
	
	public getCorrulesGraphFileName() : string {
		return "rules_graph.json";
	}

	// В корневой директории лежат пакеты экспертизы
	public getContentRoots() : string[] {

		this.checkKbPath();

		const basePath = path.join(this.getKbFullPath(), "rules");

		let rootDirectories = [];
		if (fs.existsSync(basePath)){		
			rootDirectories = rootDirectories.concat(fs.readdirSync(basePath, { withFileTypes: true })
				.filter(dir => dir.isDirectory())
				.map(dir => path.join(basePath, dir.name)));
		}
		return rootDirectories;
	}

	public getPackages() : string[] {
		const contentRoots = this.getContentRoots();
		const packagesDirectories = [];
		
		for(const root in contentRoots){
			packagesDirectories.concat(fs.readdirSync(root, { withFileTypes: true })
			.filter(dir => dir.isDirectory())
			.map(dir => dir.name));
		}		
		return packagesDirectories;
	}

	public getAppendixPath() : string {
		this.checkKbPath();
		const relative_path = path.join(this._prefix, "contracts", "xp_appendix", "appendix.xp");
		return path.join(this.getKbFullPath(), relative_path);
	}

	public getTablesContract() : string {
		this.checkKbPath();
		const relative_path = path.join(this._prefix, "_extra", "tabular_lists", "tables_contract.yaml");
		return path.join(this.getKbFullPath(), relative_path);
	}

	public getRulesDirFilters() : string {
		this.checkKbPath();
		const relative_path = path.join(this._prefix, "common", "rules_filters");
		return path.join(this.getKbFullPath(), relative_path);
	}

	public isKbOpened() : boolean {
		const kbPath = EDRPathHelper.get();
		const requredFolders = kbPath.getContentRoots();
		requredFolders.concat(kbPath.getRulesDirFilters());
		for (const folder of requredFolders){
			if (!fs.existsSync(folder)){
				return false;
			}
		}
		return true;
	}
}