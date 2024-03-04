import * as fs from 'fs';
import * as os from 'os';
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
import { ContentTreeProvider } from '../contentTreeProvider';
import { OriginsManager } from '../../../models/content/originsManager';


export class PackKbCommand {
	constructor(private _config: Configuration) {}

	public async execute(selectedPackage : ContentTreeBaseItem, unpackKbFilePath : string) : Promise<void> {

		if(fs.existsSync(unpackKbFilePath)) {
			await fs.promises.unlink(unpackKbFilePath);
		}

		// Проверка наличия утилиты сборки kb-файлов.
		const knowledgeBasePackagerCli = this._config.getKbPackFullPath();
		if(!fs.existsSync(knowledgeBasePackagerCli)) {
			DialogHelper.showError("Путь к утилите сборке kb-файла задан не верно. Измените его в настройках и повторите попытку");
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

				// Исправляем системный путь с тильдой, утилита такого пути не понимает
				let tmpSubDirectoryPath = this._config.getRandTmpSubDirectoryPath();
				const username = os.userInfo().username;
				tmpSubDirectoryPath = FileSystemHelper.resolveTildeWindowsUserHomePath(
					tmpSubDirectoryPath,
					username);
				
				await fs.promises.mkdir(tmpSubDirectoryPath, {recursive: true});

				// в objects положить пакет для сборке
				const objectsPackageDirPath = path.join(tmpSubDirectoryPath, ContentTreeProvider.PACKAGES_DIRNAME, packageName);
				await fs.promises.mkdir(objectsPackageDirPath, {recursive: true});
				await fse.copy(packageDirPath, objectsPackageDirPath);

				// Меняем новые строки \r\n -> \n
				const contentFullPaths = FileSystemHelper.getRecursiveFilesSync(objectsPackageDirPath);
				for(const contentFullPath of contentFullPaths) {
					let content = await fs.promises.readFile(contentFullPath, "utf-8");
					content = KbHelper.convertWindowsEOFToLinux(content);
					await fs.promises.writeFile(contentFullPath, content);
				}

				// Создаем contracts
				const contractsDirPath = path.join(tmpSubDirectoryPath, ContentTreeProvider.CONTRACTS_UNPACKED_DIRNAME);
				await fs.promises.mkdir(contractsDirPath, {recursive: true});
				
				// Создаем contracts\origins
				const originsDirPath = path.join(contractsDirPath, PackKbCommand.ORIGIN_DIRNAME);
				await fs.promises.mkdir(originsDirPath, {recursive: true});

				// Проверяем путь к контрактам и копируем их.
				const taxonomyPath = path.join(contractsDirPath, "taxonomy");
				await fs.promises.mkdir(taxonomyPath, {recursive: true});
				const сontractsDirectoryPath = this._config.getTaxonomyDirPath();
				await fse.copy(сontractsDirectoryPath, taxonomyPath);

				// Копируем origins из настроек
				const originObject = OriginsManager.getCurrentOrigin(this._config);
				const originString = JSON.stringify(originObject, null, 4);
				const originsDstDirPath = path.join(originsDirPath, PackKbCommand.ORIGIN_FILENAME);
				await fs.promises.writeFile(originsDstDirPath, originString);

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
					DialogHelper.showInfo(`Пакет '${packageName}' успешно собран`);
					return;
				} 

				DialogHelper.showError(`Ошибка сборки пакета '${packageName}'. Смотри Output`);
				this._config.getOutputChannel().show();
			}
			catch(error) {
				ExceptionHelper.show(error, "Внутренняя ошибка расширения");
			}
		});
	}

	public static ORIGIN_FILENAME = "origins.json";
	public static ORIGIN_DIRNAME = "origins";

	private readonly successSubstring = "Knowledge base package creation completed successfully";
}
