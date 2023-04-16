import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { ProcessHelper } from '../../../helpers/processHelper';
import { SiemjConfigHelper } from '../../../models/siemj/siemjConfigHelper';
import { SiemJOutputParser } from '../../../models/siemj/siemJOutputParser';
import { Configuration } from '../../../models/configuration';
import { SiemjConfBuilder } from '../../../models/siemj/siemjConfigBuilder';
import { XpException } from '../../../models/xpException';

export class BuildAllAction {
	constructor(private _config: Configuration, private _outputParser: SiemJOutputParser) {
	}

	public async run() : Promise<boolean> {

		return vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: false,
			title: `Сбор всех артефактов`
		}, async (progress) => {
			try {
				await SiemjConfigHelper.clearArtifacts(this._config);
				
				// Если в правиле используются сабрули, тогда собираем весь граф корреляций.
				const siemjConfContents = this.getBuildAllGraphs(this._config);
				
				// Очищаем и показываем окно Output.
				this._config.getOutputChannel().clear();
				this._config.getDiagnosticCollection().clear();
				
				for (const siemjConfContent of siemjConfContents) {
					if(!siemjConfContent) {
						throw new XpException("Не удалось сгенерировать siemj.conf для заданного правила и тестов.");
					}

					// Cохраняем конфигурационный файл для siemj.
					const siemjConfigPath = this._config.getTmpSiemjConfigPath();
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
						return true;
					}

					return false;
				}
			}
			finally {
				const siemjConfigPath = this._config.getTmpSiemjConfigPath();
	
				// Очищаем временные файлы.
				await fs.promises.access(siemjConfigPath).then(
					() => { return fs.promises.unlink(siemjConfigPath); }
				);
			}
		});
	}

	private getBuildAllGraphs(config : Configuration ) : string[] {
		const rootPaths = config.getContentRoots();

		return rootPaths.map(rootPath => { 
			const rootFolder = config.getOutputDirectoryPath(path.basename(rootPath));
			if(!fs.existsSync(rootFolder)) {
				fs.mkdirSync(rootFolder, {recursive: true});
			}

			const configBuilder = new SiemjConfBuilder(config, rootFolder);
			configBuilder.addNormalizationsGraphBuilding(false);
			configBuilder.addTablesSchemaBuilding();
			configBuilder.addTablesDbBuilding();
			configBuilder.addEnrichmentsGraphBuilding(false);
			configBuilder.addLocalizationsBuilding();
	
			const siemjConfContent = configBuilder.build();
			return siemjConfContent;
		});
	}

	private readonly SUCCESS_EXIT_CODE_SUBSTRING = "SUBPROCESS EXIT CODE: 1";
}
