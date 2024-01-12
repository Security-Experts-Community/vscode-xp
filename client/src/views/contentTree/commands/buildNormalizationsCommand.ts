import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { SiemjConfigHelper } from '../../../models/siemj/siemjConfigHelper';
import { SiemJOutputParser } from '../../../models/siemj/siemJOutputParser';
import { Configuration } from '../../../models/configuration';
import { SiemjConfBuilder } from '../../../models/siemj/siemjConfigBuilder';
import { XpException } from '../../../models/xpException';
import { DialogHelper } from '../../../helpers/dialogHelper';
import { Log } from '../../../extension';
import { SiemjManager } from '../../../models/siemj/siemjManager';

/**
 * Команда выполняющая сборку формул нормализации
 */
export class BuildNormalizationsCommand {
	constructor(private _config: Configuration, private _outputParser: SiemJOutputParser) {}

	public async execute() : Promise<void> {
		Log.info("Запущена компиляция всех нормализаций");

		return vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: true,
			title: `Компиляция всех нормализаций`
		}, async (progress, cancellationToken: vscode.CancellationToken) => {

			await SiemjConfigHelper.clearArtifacts(this._config);
			
			// Если в правиле используются сабрули, тогда собираем весь граф корреляций.
			const siemjConfContents = this.getParamsForAllRoots(this._config);
			
			this._config.getDiagnosticCollection().clear();
			
			for (const siemjConfContentEntity of siemjConfContents) {

				const rootFolder = siemjConfContentEntity['packagesRoot'];
				const siemjConfContent = siemjConfContentEntity['configContent'];
				try {
					if(!siemjConfContent) {
						throw new XpException("Не удалось сгенерировать siemj.conf для заданного правила и тестов.");
					}

					const siemjManager = new SiemjManager(this._config, cancellationToken);
					const contentRootPath = path.join(this._config.getKbFullPath(), rootFolder);
					const siemjExecutionResult = await siemjManager.executeSiemjConfig(contentRootPath, siemjConfContent);
					const result = await this._outputParser.parse(siemjExecutionResult.output);

					// Выводим ошибки и замечания для тестируемого правила.
					for (const rfd of result.fileDiagnostics) {
						this._config.getDiagnosticCollection().set(rfd.uri, rfd.diagnostics);
					}

					if(result.statusMessage) {
						DialogHelper.showError(result.statusMessage);
						return;
					}

					DialogHelper.showInfo(`Компиляция всех нормализаций успешно завершена`);
				}
				finally {
					const tmpPath = this._config.getTmpDirectoryPath(rootFolder);
					try {
						// Очищаем временные файлы.
						if (fs.lstatSync(tmpPath).isDirectory()) {
							await fs.promises.rmdir(tmpPath, {recursive: true});
						} else {
							await fs.promises.access(tmpPath).then(
								() => { return fs.promises.unlink(tmpPath); }
							);
						}
					}
					catch(e) {
						Log.warn("Очистка временных файлов", e);
					}
				}
			}
		});
	}

	private getParamsForAllRoots(config : Configuration ) : any[] {
		const rootPaths = config.getContentRoots();

		return rootPaths.map(rootPath => { 
			const rootFolder = path.basename(rootPath);
			const outputDirectory = config.getOutputDirectoryPath(rootFolder);
			if(!fs.existsSync(outputDirectory)) {
				fs.mkdirSync(outputDirectory, {recursive: true});
			}

			const configBuilder = new SiemjConfBuilder(config, rootPath);
			configBuilder.addNormalizationsGraphBuilding();
	
			const siemjConfContent = configBuilder.build();
			return {'packagesRoot': rootFolder, 'configContent':siemjConfContent};
		});
	}
}
