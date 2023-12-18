import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { DialogHelper } from '../../../helpers/dialogHelper';
import { FileSystemHelper } from '../../../helpers/fileSystemHelper';
import { KbHelper } from '../../../helpers/kbHelper';
import { ProcessHelper } from '../../../helpers/processHelper';
import { Configuration } from '../../../models/configuration';
import { ExceptionHelper } from '../../../helpers/exceptionHelper';
import { ContentTreeBaseItem } from '../../../models/content/contentTreeBaseItem';

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
			DialogHelper.showError(`Путь не выбран.`);
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
			DialogHelper.showError('Путь к утилите сборки пакетов экспертизы задан не верно. Измените его [в настройках расширения](command:workbench.action.openSettings?["xpConfig.kbtBaseDirectory"]) и повторите попытку');
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
				await fs.promises.mkdir(contractsDirPath, {recursive: true});

				// Проверяем путь к контрактам и копируем их.
				const taxonomyPath = path.join(contractsDirPath, "taxonomy");
				await fs.promises.mkdir(taxonomyPath, {recursive: true});
				const сontractsDirectoryPath = this.config.getTaxonomyDirPath();
				await fse.copy(сontractsDirectoryPath, taxonomyPath);

				/** Типовая команда выглядит так:
				 * 				 
				 * kbtools.exe pack -s "c:\src\path" -o "c:\dst\path\packages.kb
				 */
				emitter.fire(`\n\nXP:: Промежуточный статус: Запущена команда архивации файлов, это может занимать длительное время!\n\n`);
				const output  = await ProcessHelper.executeWithArgsWithRealtimeEmmiterOutput(
					"dotnet",
					[
						knowledgeBasePackagerCli,
						"pack", 
						"-s", tmpSubDirectoryPath, 
						"-o", unpackKbFilePath
					],
					emitter
				);
				emitter.fire(`\n\nXP:: Промежуточный статус: Команда выполнена!\n\n`);
				if(output.includes("Knowledge base package creation completed successfully")) {
					DialogHelper.showInfo(`Пакет '${packageName}' успешно собран.`);
					return;
				} 
				DialogHelper.showError(`Ошибка сборки пакета '${packageName}'. Смотри Output.`);
			}
			catch(error) {
				// TODO: Нужно все внутренние ошибки обрабатывть единообразно
				DialogHelper.showError(`Внутренняя ошибка расширения.\n ${error.message}.`);
			}
		});
	}
}

export class PackKbAction {
	constructor(private _config: Configuration) {
	}

	public async run(selectedPackage : ContentTreeBaseItem, unpackKbFilePath : string) : Promise<void> {

		if(fs.existsSync(unpackKbFilePath)) {
			await fs.promises.unlink(unpackKbFilePath);
		}

		// Проверка наличия утилиты сборки kb-файлов.
		const knowledgeBasePackagerCli = this._config.getKbPackFullPath();
		if(!fs.existsSync(knowledgeBasePackagerCli)) {
			DialogHelper.showError("Путь к утилите сборке kb-файла задан не верно. Измените его в настройках и повторите попытку.");
			return;
		}

		return vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: false
		}, async (progress) => {

			try {
				// Выводим описание задачи.
				const packageDirPath = selectedPackage.getDirectoryPath();
				const packageName = path.basename(packageDirPath);
				progress.report({message: `Сборка пакета '${packageName}'`});

				const tmpSubDirectoryPath = this._config.getRandTmpSubDirectoryPath();
				await fs.promises.mkdir(tmpSubDirectoryPath, {recursive: true});

				// Очищаем окно Output.
				this._config.getOutputChannel().clear();

				// в objects положить пакет для сборке
				// TODO: Проверить корректность названия папки. Утилита сборки ищет папку objects
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

				// Создаем contracts
				const contractsDirPath = path.join(tmpSubDirectoryPath, "contracts");
				await fs.promises.mkdir(contractsDirPath, {recursive: true});
				
				// Создаем contracts\origins
				const originsDirPath = path.join(contractsDirPath, "origins");
				await fs.promises.mkdir(originsDirPath, {recursive: true});

				// Проверяем путь к контрактам и копируем их.
				const taxonomyPath = path.join(contractsDirPath, "taxonomy");
				await fs.promises.mkdir(taxonomyPath, {recursive: true});
				const сontractsDirectoryPath = this._config.getTaxonomyDirPath();
				await fse.copy(сontractsDirectoryPath, taxonomyPath);

				// Копируем origins из шаблона
				const originsSrcFilePath = this._config.getOriginsFilePath();
				const originsDstDirPath = path.join(originsDirPath, "origins.json");
				await fs.promises.copyFile(originsSrcFilePath, originsDstDirPath);

				// Типовая команда выглядит так:
				// dotnet kbpack.dll pack -s "c:\tmp\pack" -o "c:\tmp\pack\Esc.kb"
				const output = await ProcessHelper.execute(
					"dotnet",
					[
						knowledgeBasePackagerCli, 
						"pack", 
						"-s", tmpSubDirectoryPath, 
						"-o", unpackKbFilePath
					],
					{	
						encoding: 'utf-8',
						outputChannel: this._config.getOutputChannel()
					}
				);

				if(output.output.includes(this.successSubstring)) {
					DialogHelper.showInfo(`Пакет '${packageName}' успешно собран.`);
					return;
				} 

				DialogHelper.showError(`Ошибка сборки пакета '${packageName}'. Смотри Output.`);
				this._config.getOutputChannel().show();
			}
			catch(error) {
				ExceptionHelper.show(error, "Внутренняя ошибка расширения.");
			}
		});
	}

	private readonly successSubstring = "Knowledge base package creation completed successfully";
}
