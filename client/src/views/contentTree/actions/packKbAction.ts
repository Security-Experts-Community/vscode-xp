import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { ExtensionHelper } from '../../../helpers/extensionHelper';
import { FileSystemHelper } from '../../../helpers/fileSystemHelper';
import { KbHelper } from '../../../helpers/kbHelper';
import { ProcessHelper } from '../../../helpers/processHelper';
import { Configuration } from '../../../models/configuration';
import { RuleBaseItem } from '../../../models/content/ruleBaseItem';
import { ExceptionHelper } from '../../../helpers/exceptionHelper';

export class PackKbAction {
	constructor(private _config: Configuration) {
	}

	public async run(selectedPackage : RuleBaseItem, unpackKbFilePath : string) : Promise<void> {

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

			try {
				// Выводим описание задачи.
				const packageDirPath = selectedPackage.getDirectoryPath();
				const packageName = path.basename(packageDirPath);
				progress.report({message: `Сборка пакета '${packageName}'`});

				const tmpSubDirectoryPath = this._config.getRandTmpSubDirectoryPath();
				await fs.promises.mkdir(tmpSubDirectoryPath, {recursive: true});

				// Очищаем окно Output.
				this._config.getOutputChannel().clear();

				// В objects положить пакет для сборки.
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

				const contractsDirPath = path.join(tmpSubDirectoryPath, "contracts");
				await fs.promises.mkdir(contractsDirPath);

				// Проверяем путь к контрактам и копируем их.
				const taxonomyPath = path.join(contractsDirPath, "taxonomy");
				await fs.promises.mkdir(taxonomyPath);
				const сontractsDirectoryPath = this._config.getTaxonomyDirPath();
				await fse.copy(сontractsDirectoryPath, taxonomyPath);

				// Типовая команда выглядит так:
				// kbtools(kbpack).exe pack -s "c:\tmp\pack" -o "c:\tmp\pack\Esc.kb"
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
				ExceptionHelper.show(error, "Произошла неожиданная ошибка.");
			}
		});
	}

	private readonly successSubstring = "Knowledge base package creation completed successfully";
}