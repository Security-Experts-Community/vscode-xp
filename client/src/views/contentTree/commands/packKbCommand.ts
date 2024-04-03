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
import { ViewCommand } from './viewCommand';
import { Log } from '../../../extension';


export class PackKbCommand extends ViewCommand {
	constructor(private config: Configuration, private selectedPackage : ContentTreeBaseItem, private unpackKbFilePath : string) {
		super();
	}

	public async execute() : Promise<void> {
		if(fs.existsSync(this.unpackKbFilePath)) {
			await fs.promises.unlink(this.unpackKbFilePath);
		}

		// Проверка наличия утилиты сборки kb-файлов.
		const knowledgeBasePackagerCli = this.config.getKbPackFullPath();
		if(!fs.existsSync(knowledgeBasePackagerCli)) {
			DialogHelper.showError(`Путь к утилите сборки kb-файла задан не верно. Проверьте корректность [пути к KBT](command:workbench.action.openSettings?["xpConfig.kbtBaseDirectory"]) или загрузите актуальную версию [отсюда](https://github.com/vxcontrol/xp-kbt/releases)`);
			return;
		}

		const packageObjectId = this.selectedPackage.getMetaInfo().getObjectId();
		const packageContentPrefixRegExp = /^(\S+?)-/g.exec(packageObjectId);
		if(packageContentPrefixRegExp && packageContentPrefixRegExp.length == 2) {
			const packageContentPrefix = packageContentPrefixRegExp[1];
			const currentContentPrefix = this.config.getContentPrefix();
	
			if(packageContentPrefix !== currentContentPrefix) {
				DialogHelper.showWarning(`Имя поставщика ${currentContentPrefix} не соответствует ObjectId пакета ${packageObjectId}, возможны проблемы при его установке в продукт. Смените имя поставщика или ObjectId пакета`);
			}
		} else {
			DialogHelper.showWarning(`Не удалось выделить префикс контента из ObjectId пакета`);
		}

		return vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: false
		}, async (progress) => {
			try {
				// Выводим описание задачи.
				const packageDirPath = this.selectedPackage.getDirectoryPath();
				const packageName = path.basename(packageDirPath);
				progress.report({message: `Сборка пакета '${packageName}'`});

				// Полезно, если путь к директории временных файлов (в домашней директории) будет сокращен тильдой.
				const username = os.userInfo().username;
				Log.info("Username:", username);

				// Исправляем системный путь с тильдой, утилита такого пути не понимает
				let tmpPackageDirectoryPath = this.config.getRandTmpSubDirectoryPath();
				tmpPackageDirectoryPath = FileSystemHelper.resolveTildeWindowsUserHomePath(
					tmpPackageDirectoryPath,
					username);
				
				await fs.promises.mkdir(tmpPackageDirectoryPath, {recursive: true});

				// в objects положить пакет для сборке
				const objectsPackageDirPath = path.join(tmpPackageDirectoryPath, ContentTreeProvider.PACKAGES_DIRNAME, packageName);
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
				const contractsDirPath = path.join(tmpPackageDirectoryPath, ContentTreeProvider.CONTRACTS_UNPACKED_DIRNAME);
				await fs.promises.mkdir(contractsDirPath, {recursive: true});
				
				// Создаем contracts\origins
				const originsDirPath = path.join(contractsDirPath, PackKbCommand.ORIGIN_DIRNAME);
				await fs.promises.mkdir(originsDirPath, {recursive: true});

				// Проверяем путь к контрактам и копируем их.
				const taxonomyPath = path.join(contractsDirPath, ContentTreeProvider.TAXONOMY_DIRNAME);
				await fs.promises.mkdir(taxonomyPath, {recursive: true});
				const сontractsDirectoryPath = this.config.getTaxonomyDirPath();
				await fse.copy(сontractsDirectoryPath, taxonomyPath);

				// Копируем origins из настроек
				const originObject = await OriginsManager.getCurrentOrigin(this.config);
				const originString = JSON.stringify(originObject, null, 4);
				const originsDstDirPath = path.join(originsDirPath, PackKbCommand.ORIGIN_FILENAME);
				await fs.promises.writeFile(originsDstDirPath, originString);

				// Типовая команда выглядит так:
				// dotnet kbpack.dll pack -s "c:\tmp\pack" -o "c:\tmp\pack\Esc.kb"
				Log.info("TmpPackageDirectoryPath: ", tmpPackageDirectoryPath);
				const output = await ProcessHelper.execute(
					"dotnet",
					[
						knowledgeBasePackagerCli, 
						"pack", 
						"-s", tmpPackageDirectoryPath, 
						"-o", this.unpackKbFilePath
					],
					{	
						encoding: 'utf-8',
						outputChannel: this.config.getOutputChannel()
					}
				);

				if(output.output.includes(this.successSubstring)) {
					DialogHelper.showInfo(`Пакет '${packageName}' успешно собран`);
					return;
				} 

				DialogHelper.showError(`Ошибка сборки пакета '${packageName}'. [Смотри Output](command:xp.commonCommands.showOutputChannel)`);
				this.config.getOutputChannel().show();
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
