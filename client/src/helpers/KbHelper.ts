import * as fs from 'fs';
import * as path from 'path';
import * as crc32 from 'crc-32';
import * as vscode from 'vscode';

import { RuleBaseItem } from '../models/content/ruleBaseItem';

export class KbHelper {

	/**
	 * Заменяет новые строки Windows формата на Linux (\r\n -> \n)
	 * @param text входная строка
	 * @returns результирующая строка
	 */
	public static convertWindowsEOFToLinux (text : string) : string {
		return text.replace(/(\r\n)/gm, "\n");
	}

	public static getContentSubDirectories(): string[] {
		return ["correlation_rules", "tabular_lists", "aggregation_rules", "enrichment_rules", "normalization_formulas"];
	}

	public static generateRuleObjectId(rule : RuleBaseItem, contentPrefix : string) : string {
		const ruleName = rule.getName();
		let objectId = Math.abs(crc32.str(ruleName)).toString();
		objectId = objectId.substring(0, 9);
		return `${contentPrefix}-CR-${objectId}`;
	}

	public static generatePackageObjectId(packageName : string, contentPrefix : string) : string {
		let objectId = Math.abs(crc32.str(packageName)).toString();
		objectId = objectId.substring(0, 9);
		return `${contentPrefix}-PKG-${objectId}`;
	}

	public static getKbPaths() : KbPaths {
		const kbFullPath =
		(vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;

		if(!kbFullPath || !fs.existsSync(kbFullPath)) {
			throw new Error(`Некорректный путь '${kbFullPath}'`);
		}

		return new KbPaths(kbFullPath);
	}
}

export class KbPaths {
	constructor(private _kbFullPath: string) {
	}

	public getPackagesPath() : string {
		// rules_src=C:\\Work\\-=SIEM=-\\Content\\knowledgebase\\packages
		return path.join(this._kbFullPath, "packages");
	}

	public getAppendixPath() : string {
		// xp_appendix=C:\\Work\\-=SIEM=-\\Content\\knowledgebase\\contracts\\xp_appendix\\appendix.xp
		return path.join(this._kbFullPath, "contracts", "xp_appendix", "appendix.xp");
	}

	public getTablesContract() : string {
		// C:\Work\-=SIEM=-\Content\knowledgebase\_extra\tabular_lists\tables_contract.yaml
		return path.join(this._kbFullPath, "_extra", "tabular_lists", "tables_contract.yaml");
	}

	public getRulesDirFilters() : string {
		// C:\Work\-=SIEM=-\Content\knowledgebase\common\rules_filters
		return path.join(this._kbFullPath, "common", "rules_filters");
	}
}








