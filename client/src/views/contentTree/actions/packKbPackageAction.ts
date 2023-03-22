import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { ExtensionHelper } from '../../../helpers/extensionHelper';
import { FileSystemHelper } from '../../../helpers/fileSystemHelper';
import { KbHelper } from '../../../helpers/kbHelper';
import { ProcessHelper } from '../../../helpers/processHelper';
import { VsCodeApiHelper } from '../../../helpers/vsCodeApiHelper';
import { Configuration } from '../../../models/configuration';
import { RuleBaseItem } from '../../../models/content/ruleBaseItem';

export class PackSIEMAllPackagesAction {
	constructor(private config: Configuration) {}

	private async copyFiles(src: string, dst: string){
		return vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: true
		}, async (progress) => {
			await fse.copy(src, dst);
		});
	}

	public async run(packagePath : string, emitter: vscode.EventEmitter<string>) : Promise<void> {
		// Выбираем директорию для выгрузки пакета.
		const packageName = path.basename(packagePath);
		const fileInfos = await vscode.window.showSaveDialog({
			title: `Сохранить пакет как...`,
			saveLabel: 'Сохранить',
			filters: {'Knowledge base (*.kb)' : ['kb']},
			defaultUri: vscode.Uri.file(packageName)
		});

		if(!fileInfos) {
			ExtensionHelper.showUserError(`Путь не выбран.`);
			return;
		}

		// Удаление существующего файла.
		const unpackKbFilePath = fileInfos.fsPath; 
		if(fs.existsSync(unpackKbFilePath)) {
			await fs.promises.unlink(unpackKbFilePath);
		}

		// Проверка наличия утилиты сборки kb-файлов.
		const knowledgeBasePackagerCli = this.config.getKbPackFullPath();
		if(!fs.existsSync(knowledgeBasePackagerCli)) {
			ExtensionHelper.showUserError("Путь к утилите сборке kb-файла задан не верно. Измените его в настройках и повторите попытку.");
			return;
		}

		return vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: false
		}, async (progress) => {
			// Выводим описание задачи.
			progress.report({message: `Сборка пакетов из директории '${packageName}'`});
			const tmpSubDirectoryPath = this.config.getRandTmpSubDirectoryPath();
			try {
				// в objects положить пакет для сборки
				const objectsPackageDirPath = path.join(tmpSubDirectoryPath, packageName);
				await fs.promises.mkdir(objectsPackageDirPath, {recursive: true});
				
				emitter.fire(`\n\nXP:: Промежуточный статус: Копируем файлы во временную директорию ${objectsPackageDirPath}. Это может занимать длительное время!\n\n`);
				await this.copyFiles(packagePath, objectsPackageDirPath);
				//await fse.copy(packagePath, objectsPackageDirPath);
				emitter.fire(`\n\nXP:: Промежуточный статус: Файлы скопированы!\n\n`);

				// Меняем новые строки \r\n -> \n
				const contentfullPaths = FileSystemHelper.getRecursiveFilesSync(objectsPackageDirPath);
				for(const contentfullPath of contentfullPaths) {
					let content = await fs.promises.readFile(contentfullPath, "utf-8");
					content = KbHelper.convertWindowsEOFToLinux(content);
					await fs.promises.writeFile(contentfullPath, content);
				}

				// Нужна ссылка в 
				const contractsDirPath = path.join(tmpSubDirectoryPath, "contracts");
				await fs.promises.mkdir(contractsDirPath);

				// Проверяем путь к контрактам и копируем их.
				const taxonomyPath = path.join(contractsDirPath, "taxonomy");
				await fs.promises.mkdir(taxonomyPath);
				const сontractsDirectoryPath = this.config.getTaxonomyDirPath();
				await fse.copy(сontractsDirectoryPath, taxonomyPath);

				/** Типовая команда выглядит так:
				 * 				 
				 * kbtools.exe pack -s "c:\src\path" -o "c:\dst\path\packages.kb
				 */
				emitter.fire(`\n\nXP:: Промежуточный статус: Запущена команда архивации файлов, это может занимать длительное время!\n\n`);
				const output = await ProcessHelper.ExecuteWithArgsWithRealtimeEmmiterOutput(
					knowledgeBasePackagerCli,
					[
						"pack", 
						"-s", tmpSubDirectoryPath, 
						"-o", unpackKbFilePath
					],
					emitter
				);
				emitter.fire(`\n\nXP:: Промежуточный статус: Команда выполнена!\n\n`);
				if(output.includes("Knowledge base package creation completed successfully")) {
					ExtensionHelper.showUserInfo(`Пакет '${packageName}' успешно собран.`);
					return;
				} 
				ExtensionHelper.showUserError(`Ошибка сборки пакета '${packageName}'. Смотри Output.`);
			}
			catch(error) {
				ExtensionHelper.showUserError("Произошла неожиданная ошибка.");
			}
		});
	}
}

export class PackKbPackageAction {
	constructor(private _config: Configuration) {
	}

	public async run(selectedPackage : RuleBaseItem) : Promise<void> {

		// Выбираем директорию для выгрузки пакета.
		const packageName = selectedPackage.getName();
		const fileInfos = await vscode.window.showSaveDialog({
			filters: {'Knowledge base (*.kb)' : ['kb']},
			defaultUri: vscode.Uri.file(packageName)
		});

		if(!fileInfos) {
			ExtensionHelper.showUserError(`Путь не выбран.`);
			return;
		}

		// Удаление существующего файла.
		const unpackKbFilePath = fileInfos.fsPath; 
		if(fs.existsSync(unpackKbFilePath)) {
			await fs.promises.unlink(unpackKbFilePath);
		}

		// Проверка наличия утилиты сборки kb-файлов.
		const knowledgeBasePackagerCli = this._config.getKbPackFullPath();
		if(!fs.existsSync(knowledgeBasePackagerCli)) {
			ExtensionHelper.showUserError("Путь к утилите сборке kb-файла задан не верно. Измените его в настройках и повторите попытку.");
			return;
		}

		return vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: false
		}, async (progress) => {

			// Выводим описание задачи.
			const packageDirPath = selectedPackage.getDirectoryPath();
			const packageName = path.basename(packageDirPath);
			progress.report({message: `Сборка пакета '${packageName}'`});

			const tmpSubDirectoryPath = this._config.getRandTmpSubDirectoryPath();
			await fs.promises.mkdir(tmpSubDirectoryPath);

			// Очищаем окно Output.
			this._config.getOutputChannel().clear();

			try {
				// в objects положить пакет для сборке
				const objectsPackageDirPath = path.join(tmpSubDirectoryPath, "packages", packageName);
				await fs.promises.mkdir(objectsPackageDirPath, {recursive: true});
				await fse.copy(packageDirPath, objectsPackageDirPath);

				// Меняем новые строки \r\n -> \n
				const contentfullPaths = FileSystemHelper.getRecursiveFilesSync(objectsPackageDirPath);
				for(const contentfullPath of contentfullPaths) {
					let content = await fs.promises.readFile(contentfullPath, "utf-8");
					content = KbHelper.convertWindowsEOFToLinux(content);
					await fs.promises.writeFile(contentfullPath, content);
				}

				// Нужна ссылка в 
				const contractsDirPath = path.join(tmpSubDirectoryPath, "contracts");
				await fs.promises.mkdir(contractsDirPath);

				// Проверяем путь к контрактам и копируем их.
				const taxonomyPath = path.join(contractsDirPath, "taxonomy");
				await fs.promises.mkdir(taxonomyPath);
				const сontractsDirectoryPath = this._config.getTaxonomyDirPath();
				await fse.copy(сontractsDirectoryPath, taxonomyPath);

				// Типовая команда выглядит так:
				// kbtools.exe pack -s "c:\tmp\pack" -o "c:\tmp\pack\Esc.kb"
				const output = await ProcessHelper.ExecuteWithArgsWithRealtimeOutput(
					knowledgeBasePackagerCli,
					[
						"pack", 
						"-s", tmpSubDirectoryPath, 
						"-o", unpackKbFilePath
					],
					this._config.getOutputChannel()
				);

				if(output.includes(this.successSubstring)) {
					ExtensionHelper.showUserInfo(`Пакет '${packageName}' успешно собран.`);
					return;
				} 

				ExtensionHelper.showUserError(`Ошибка сборки пакета '${packageName}'. Смотри Output.`);
				this._config.getOutputChannel().show();
			}
			catch(error) {
				ExtensionHelper.showUserError("Произошла неожиданная ошибка.");
			}
		});
	}

	private readonly successSubstring = "Knowledge base package creation completed successfully";
}