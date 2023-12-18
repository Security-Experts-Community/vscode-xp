import * as vscode from 'vscode';
import { extensions} from 'vscode';

import { API, GitExtension } from '../@types/vscode.git';
import { RuleBaseItem } from '../models/content/ruleBaseItem';
import { FileSystemHelper } from './fileSystemHelper';

export class VsCodeApiHelper {
	public static getDocumentRange(textEditor: vscode.TextEditor) : vscode.Range {
		const firstLine = textEditor.document.lineAt(0);
		const lastLine = textEditor.document.lineAt(textEditor.document.lineCount - 1);
		return new vscode.Range(firstLine.range.start, lastLine.range.end);
	}

	public static closeActiveEditor() : Thenable<unknown>{
		return vscode.commands.executeCommand('workbench.action.closeActiveEditor');
	}

	public static openFolder(folderPath: string) : Thenable<unknown> {
		const folderUri = vscode.Uri.file(folderPath);
		return vscode.commands.executeCommand('vscode.openFolder', folderUri);
	}

	public static openSettings(findString: string) : Thenable<unknown> {
		return vscode.commands.executeCommand('workbench.action.openSettings', findString);
	}

	/**
	 * Закрыть все открытые в VsCode файлы, находящиеся по указанному пути.
	 * @param path путь из которого все открытые файлы должны быть закрыты.
	 */
	public static async closeAllActiveEditorsIncludesPath(path: string) : Promise<void> {
		for (const td of vscode.workspace.textDocuments) {
			const openFilePath = td.fileName; 

			if(openFilePath.startsWith(path)) {
				// Закрываем открытый файл.
				await vscode.window.showTextDocument(td.uri, {preview: true, preserveFocus: false});
				await VsCodeApiHelper.closeActiveEditor();
			}
		}
	}

	/**
	 * Сохраняет несохраненный файл открытого в VsCode правила на диск.
	 * @param rule правило, код которого необходимо сохранить на диск.
	 */
	public static async saveRuleCodeFile(rule: RuleBaseItem) : Promise<void> {
		vscode.workspace.textDocuments.forEach(async td => {
			const openFilePath = td.fileName;
			if(openFilePath.toLocaleLowerCase() === rule.getRuleFilePath().toLocaleLowerCase()) {
				await td.save();
			}
		});
	}

	public static async saveTestFiles(rule: RuleBaseItem) : Promise<void> {
		vscode.workspace.textDocuments.forEach(async td => {
			// 
			if(!td.isDirty) {
				return;
			}

			if(td.isUntitled) {
				return;
			}

			const openFilePath = td.fileName.toLocaleLowerCase();
			const ruleDirectoryPath = rule.getDirectoryPath().toLocaleLowerCase();

			if(openFilePath.includes(ruleDirectoryPath) && FileSystemHelper.isIncludeDirectoryInPath(openFilePath, "tests") ) {
				await td.save();
			}
		});
	}

	public static async getGitExtension(): Promise<API | undefined> {
		try {
			const extension = extensions.getExtension<GitExtension>('vscode.git');
			if (extension == null) return undefined;

			const gitExtension = extension.isActive ? extension.exports : await extension.activate();
			return gitExtension?.getAPI(1);
		} catch {
			return undefined;
		}
	}

	public static isWorkDirectoryUsingGit(gitApi: API, workingTreePath: string) : boolean {
		const kbUri = vscode.Uri.file(workingTreePath);
		if(!gitApi) {
			throw new Error("Git не уcтановлен");
		}
		
		// Получаем нужный репозиторий
		const repo = gitApi.getRepository(kbUri);

		// База знаний не под git-ом.
		if(!repo) {
			return false;
		}

		return true;
	}

	public static gitWorkingTreeChanges(gitApi: API, workingTreePath: string) : string [] {
		const kbUri = vscode.Uri.file(workingTreePath);
		if(!gitApi) {
			throw new Error("Git не уcтановлен");
		}
		
		// Получаем нужный репозиторий
		const repo = gitApi.getRepository(kbUri);

		// База знаний не под git-ом.
		if(!repo) {
			throw new Error("Для контента не создан репозиторий");
		}

		const changePaths = repo.state.workingTreeChanges.map( c => {
			return c.uri.fsPath.toLocaleLowerCase();
		});

		return changePaths;
	}
}