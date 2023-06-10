import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { ExtensionHelper } from '../../../helpers/extensionHelper';
import { ProcessHelper } from '../../../helpers/processHelper';
import { VsCodeApiHelper } from '../../../helpers/vsCodeApiHelper';
import { Configuration } from '../../../models/configuration';
import { ContentTreeProvider } from '../contentTreeProvider';
import { KbTreeBaseItem } from '../../../models/content/kbTreeBaseItem';
import { ExceptionHelper } from '../../../helpers/exceptionHelper';
import { ContentHelper } from '../../../helpers/contentHelper';

export class UnpackKbAction {
	constructor(private _config: Configuration) {
	}

	public async run(selectedPackage : KbTreeBaseItem) : Promise<void> {

		// Проверка наличия утилиты сборки kb-файлов.
		const knowledgeBasePackagerCli = this._config.getKbPackFullPath();
		if(!fs.existsSync(knowledgeBasePackagerCli)) {
			ExtensionHelper.showUserError("Путь к утилите сборке kb-файла задан не верно. Измените его в настройках и повторите попытку.");
			await VsCodeApiHelper.openSettings(this._config.getExtensionSettingsPrefix());
			return;
		}

		const config = Configuration.get();
		if(!config.isKbOpened()) {
			ExtensionHelper.showUserInfo("Для распаковки пакетов нужно открыть базу знаний.");
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
			cancellable: false,
			title: "Распаковка пакета"
		}, async (progress) => {

			const kbFilePath = kbUris[0].fsPath; 

			// Получаем путь к директории пакетов.
			const exportDirPath = selectedPackage.getContentRootPath(Configuration.get());

			if(!fs.existsSync(exportDirPath)) {
				ExtensionHelper.showUserError(`Не существует такой папки для пакетов.`);
				return;
			}

			// Очищаем и показываем окно Output.
			this._config.getOutputChannel().clear();

			try {
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

				const output = await ProcessHelper.executeWithArgsWithRealtimeOutput(
					"dotnet",
					params,
					this._config.getOutputChannel()
				);

				if(!output.includes(this.SUCCESS_SUBSTRING)) {
					// TODO: тут хорошо бы сделать ссылку или кнопку для перехода в нужный канал Output.
					ExtensionHelper.showUserError(`Не удалось распаковать пакет. Подробности приведены в панели Output.`);
					this._config.getOutputChannel().appendLine(knowledgeBasePackagerCli + " " + params.join(" "));
					this._config.getOutputChannel().show();
					return;
				} 

				// TODO: Убрать этот фикс, когда починят экспорт из PTKB
				ContentHelper.fixTables(outputDirPath);

				// Если внутри несколько пакетов.
				const packagesPackagePath = path.join(outputDirPath, "packages");
				if(fs.existsSync(packagesPackagePath)) {
					await fse.copy(packagesPackagePath, exportDirPath, { overwrite: true });
				}
				
				// Если внутри один пакет.
				const objectsPackagePath = path.join(outputDirPath, "objects");
				if(!fs.existsSync(packagesPackagePath) && fs.existsSync(objectsPackagePath)) {
					const onePackagePath = path.join(exportDirPath, kbFileName);
					await fse.copy(objectsPackagePath, onePackagePath, { overwrite: true });
				}

				// Копируем макросы
				const macroPackagePath = path.join(outputDirPath, "common");
				if(fs.existsSync(macroPackagePath)) {
					const rootPath =
					(vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
						? vscode.workspace.workspaceFolders[0].uri.fsPath
						: undefined;
					if(rootPath){
						const outPath = path.join(rootPath, "common");
						await fse.copy(macroPackagePath, outPath);

						// Убираем BOM-метки из файлов
						const files = ContentHelper.getFilesByPattern(outPath, /metainfo\.yaml/);
						files.forEach(file => {
							let content = fs.readFileSync(file, 'utf8');
							if (typeof content === 'string') {
								if (content.charCodeAt(0) === 0xFEFF) {
									content = content.slice(1);
								}
								fs.writeFileSync(file, content, 'utf8');
							}
						});
					}
				}

				ExtensionHelper.showUserInfo(`Пакет успешно распакован.`);
				await ContentTreeProvider.refresh();
			}
			catch(error) {
				// TODO: Нужно все внутренние ошибки обрабатывать единообразно
				ExceptionHelper.show(error, `Внутренняя ошибка расширения: ${error.message}`);
			}
		});
	}

	private readonly SUCCESS_SUBSTRING = "Knowledge base unpacking completed successfully";
}