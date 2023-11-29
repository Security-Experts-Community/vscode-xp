import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { DialogHelper } from '../../../helpers/dialogHelper';
import { ExecutionResult, ProcessHelper } from '../../../helpers/processHelper';
import { VsCodeApiHelper } from '../../../helpers/vsCodeApiHelper';
import { Configuration } from '../../../models/configuration';
import { ContentTreeProvider } from '../contentTreeProvider';
import { ContentTreeBaseItem } from '../../../models/content/contentTreeBaseItem';
import { ContentHelper } from '../../../helpers/contentHelper';
import { XpException } from '../../../models/xpException';
import { ExceptionHelper } from '../../../helpers/exceptionHelper';

export class UnpackKbCommand {
	constructor(private _config: Configuration) {
	}

	public async execute(selectedPackage : ContentTreeBaseItem) : Promise<void> {

		// Проверка наличия утилиты сборки kb-файлов.
		const knowledgeBasePackagerCli = this._config.getKbPackFullPath();
		if(!fs.existsSync(knowledgeBasePackagerCli)) {
			DialogHelper.showError("Путь к утилите сборке kb-файла задан не верно. Измените его в настройках и повторите попытку.");
			await VsCodeApiHelper.openSettings(this._config.getExtensionSettingsPrefix());
			return;
		}

		const config = Configuration.get();
		if(!config.isKbOpened()) {
			DialogHelper.showInfo("Для распаковки пакетов нужно открыть базу знаний.");
			return;
		}

		// Выбираем kb-файл.
		const kbUris = await vscode.window.showOpenDialog({
			canSelectFolders: false,
			canSelectMany: false,
			filters: {'Knowledge base (*.kb)' : ['kb']}
		});

		if(!kbUris) {
			return;
		}

		return vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: true,
			title: "Распаковка пакета"
		}, async (progress, cancellationToken) => {

			const kbFilePath = kbUris[0].fsPath; 

			// Получаем путь к директории пакетов.
			const packageDirPath = selectedPackage.getContentRootPath(Configuration.get());
			const rootContentDirPath = path.dirname(packageDirPath);

			if(!fs.existsSync(packageDirPath)) {
				DialogHelper.showError(`Не существует такой папки для пакетов.`);
				return;
			}

			// Очищаем и показываем окно Output.
			this._config.getOutputChannel().clear();

			const unpackPackagePath = this._config.getRandTmpSubDirectoryPath();
			await fs.promises.mkdir(unpackPackagePath, {recursive: true});

			const kbFileName = path.parse(kbFilePath).name;
			const outputDirPath = path.join(unpackPackagePath, kbFileName);

			// Типовая команда выглядит так:
			// dotnet kbpack.dll unpack -s c:\tmp\pack\esc.kb -o c:\tmp\pack\unpack\doesn_t_exist_folder
			// doesn_t_exist_folder создается самим kbtools				

			const params =  [
				knowledgeBasePackagerCli,
				"unpack",
				"-s", kbFilePath,
				"-o", outputDirPath
			];

			const cmd = "dotnet";
			let executeResult : ExecutionResult;
			try {
				executeResult = await ProcessHelper.execute(
					cmd,
					params,
					{	
						encoding: 'utf-8',
						outputChannel: this._config.getOutputChannel(),
						checkCommandBeforeExecution: true,
						cancellationToken: cancellationToken
					}
				);
			} 
			catch(error) {
				ExceptionHelper.show(error, `Ошибка выполнения команды ${cmd}. Возможно, не был установлены [.NET Runtime](https://dotnet.microsoft.com/en-us/download/dotnet/6.0) или не добавлен путь к нему в переменную PATH.`);
				return;
			}
				

			if(!executeResult.output.includes(this.SUCCESS_SUBSTRING)) {
				DialogHelper.showError(`Не удалось распаковать пакет. Подробности приведены в панели Output.`);
				return;
			} 

			// TODO: Убрать этот фикс, когда починят экспорт из PTKB
			ContentHelper.fixTables(outputDirPath);

			// Если внутри несколько пакетов.
			const packagesPackagePath = path.join(outputDirPath, ContentTreeProvider.PACKAGES_DIRNAME);
			if(fs.existsSync(packagesPackagePath)) {
				await fse.copy(packagesPackagePath, packageDirPath, { overwrite: true });
			}
			
			// Пользовательские правила и директории, которые просто лежат в корне KB.
			const objectsPackagePath = path.join(outputDirPath, this.ROOT_USERS_CONTENT_UNPACKED_DIRNAME);
			if(fs.existsSync(objectsPackagePath)) {
				await fse.copy(objectsPackagePath, packageDirPath, { overwrite: true });
			}

			// Распаковка контрактов, для пользователя не требуется.
			// const contractsTmpPath = path.join(outputDirPath, this.CONTRACTS_UNPACKED_DIRNAME);
			// const contractsPackagePath = path.join(rootContentDirPath, this.CONTRACTS_UNPACKED_DIRNAME);
			// if(fs.existsSync(contractsTmpPath)) {
			// 	await fse.copy(contractsTmpPath, contractsPackagePath, { overwrite: true });
			// }

			// Обновляем макросы
			const macroPackagePath = path.join(outputDirPath, this.MACRO_DIRNAME);
			if(fs.existsSync(macroPackagePath)) {
				const marcoDirPath = path.join(rootContentDirPath, this.MACRO_DIRNAME);
				await fse.copy(macroPackagePath, marcoDirPath);
			}

			await ContentTreeProvider.refresh();
			DialogHelper.showInfo(`Пакет успешно распакован`);
		});
	}

	private readonly SUCCESS_SUBSTRING = "Knowledge base unpacking completed successfully";

	private readonly ROOT_USERS_CONTENT_UNPACKED_DIRNAME = "objects";
	private readonly CONTRACTS_UNPACKED_DIRNAME = "contracts";
	private readonly MACRO_DIRNAME = "common";
}

