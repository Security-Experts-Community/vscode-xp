import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { ProcessHelper } from '../../../helpers/processHelper';
import { SiemjConfigHelper } from '../../../models/siemj/siemjConfigHelper';
import { SiemJOutputParser } from '../../../models/siemj/siemJOutputParser';
import { Configuration } from '../../../models/configuration';
import { SiemjConfBuilder } from '../../../models/siemj/siemjConfigBuilder';
import { XpException } from '../../../models/xpException';
import { ExtensionHelper } from '../../../helpers/extensionHelper';
import { Dictionary } from 'lodash';

export class BuildAllAction {
	constructor(private _config: Configuration, private _outputParser: SiemJOutputParser) {
	}

	public async run() : Promise<void> {

		return vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: false,
			title: `Сбор всех артефактов`
		}, async (progress) => {

			await SiemjConfigHelper.clearArtifacts(this._config);
			
			// Если в правиле используются сабрули, тогда собираем весь граф корреляций.
			const siemjConfContents = this.getBuildAllGraphs(this._config);
			
			// Очищаем и показываем окно Output.
			this._config.getOutputChannel().clear();
			this._config.getDiagnosticCollection().clear();
			
			for (const siemjConfContentEntity of siemjConfContents) {

				const rootFolder = siemjConfContentEntity['packagesRoot'];
				const siemjConfContent = siemjConfContentEntity['configContent'];
				try {
					if(!siemjConfContent) {
						throw new XpException("Не удалось сгенерировать siemj.conf для заданного правила и тестов.");
					}


					// Cохраняем конфигурационный файл для siemj.
					const siemjConfigPath = this._config.getTmpSiemjConfigPath(rootFolder);
					await SiemjConfigHelper.saveSiemjConfig(siemjConfContent, siemjConfigPath);

					// Типовая команда выглядит так:
					// "C:\\PTSIEMSDK_GUI.4.0.0.738\\tools\\siemj.exe" -c C:\\PTSIEMSDK_GUI.4.0.0.738\\temp\\siemj.conf main
					const siemjExePath = this._config.getSiemjPath();
					const siemJOutput = await ProcessHelper.ExecuteWithArgsWithRealtimeOutput(
						siemjExePath,
						["-c", siemjConfigPath, "main"],
						this._config.getOutputChannel());
					

					// Добавляем новые строки, чтобы разделить разные запуски утилиты
					this._config.getOutputChannel().append('\n\n\n');
					this._config.getOutputChannel().show();

					// Разбираем вывод siemJ и корректируем начало строки с диагностикой (исключаем пробельные символы)
					const ruleFileDiagnostics = await this._outputParser.parse(siemJOutput);

					// Выводим ошибки и замечания для тестируемого правила.
					for (const rfd of ruleFileDiagnostics) {
						this._config.getDiagnosticCollection().set(rfd.Uri, rfd.Diagnostics);
					}

					if(!siemJOutput.includes(this.SUCCESS_EXIT_CODE_SUBSTRING)) {
						ExtensionHelper.showUserInfo(`Компиляция пакетов в папке ${rootFolder} успешно завершена.`);
					}
					else {
						ExtensionHelper.showUserError(this.COMPILATION_ERROR);
					}
				}
				finally {
					const tmpPath = this._config.getTmpDirectoryPath(rootFolder);
		
					// Очищаем временные файлы.
					await fs.promises.access(tmpPath).then(
						() => { return fs.promises.unlink(tmpPath); }
					);
				}
			}
		});
	}

	private getBuildAllGraphs(config : Configuration ) : Dictionary<string>[] {
		const rootPaths = config.getContentRoots();

		return rootPaths.map(rootPath => { 
			const rootFolder = path.basename(rootPath);
			const outputDirectory = config.getOutputDirectoryPath(rootFolder);
			if(!fs.existsSync(outputDirectory)) {
				fs.mkdirSync(outputDirectory, {recursive: true});
			}

			const overwriteStatus = this._config.getNormalizationsOverwtiteStatus();

			const configBuilder = new SiemjConfBuilder(config, rootPath);
			configBuilder.addNormalizationsGraphBuilding(overwriteStatus);
			configBuilder.addTablesSchemaBuilding();
			configBuilder.addTablesDbBuilding();
			configBuilder.addEnrichmentsGraphBuilding();
			configBuilder.addCorrelationsGraphBuilding();
			configBuilder.addLocalizationsBuilding();
	
			const siemjConfContent = configBuilder.build();
			return {'packagesRoot': rootFolder, 'configContent':siemjConfContent};
		});
	}

	private readonly SUCCESS_EXIT_CODE_SUBSTRING = "SUBPROCESS EXIT CODE: 1";
	private readonly COMPILATION_ERROR = "Ошибка компиляции. Смотри Output.";
}
