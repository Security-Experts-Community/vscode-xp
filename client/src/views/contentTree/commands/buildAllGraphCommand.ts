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
import { ViewCommand } from './viewCommand';

/**
 * Команда выполняющая сборку всех графов: нормализации, агрегации, обогащения и корреляции.
 */
export class BuildAllGraphCommand extends ViewCommand {
	constructor(private config: Configuration, private outputParser: SiemJOutputParser) {
		super();
	}

	public async execute() : Promise<void> {
		Log.info("Запущена компиляция всех графов и табличных списков");

		return vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: true,
			title: `Компиляция всех графов и табличных списков`
		}, async (progress, cancellationToken: vscode.CancellationToken) => {

			await SiemjConfigHelper.clearArtifacts(this.config);
			
			// Если в правиле используются сабрули, тогда собираем весь граф корреляций.
			const siemjConfContents = this.getParamsForAllRoots(this.config);
			
			this.config.getDiagnosticCollection().clear();
			
			for (const siemjConfContentEntity of siemjConfContents) {

				const rootFolder = siemjConfContentEntity['packagesRoot'];
				const siemjConfContent = siemjConfContentEntity['configContent'];
				try {
					if(!siemjConfContent) {
						throw new XpException("Не удалось сгенерировать siemj.conf для заданного правила и тестов.");
					}

					const siemjManager = new SiemjManager(this.config, cancellationToken);
					const contentRootPath = path.join(this.config.getKbFullPath(), rootFolder);
					const siemjExecutionResult = await siemjManager.executeSiemjConfig(contentRootPath, siemjConfContent);
					const result = await this.outputParser.parse(siemjExecutionResult.output);

					// Выводим ошибки и замечания для тестируемого правила.
					for (const rfd of result.fileDiagnostics) {
						this.config.getDiagnosticCollection().set(rfd.uri, rfd.diagnostics);
					}

					if(result.statusMessage) {
						DialogHelper.showError(result.statusMessage);
						return;
					}

					DialogHelper.showInfo(`Компиляция всех графов и табличных списков успешно завершена`);
				}
				finally {
					const tmpPath = this.config.getTmpDirectoryPath(rootFolder);
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
					catch(e){
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
			configBuilder.addAggregationGraphBuilding();
			configBuilder.addTablesSchemaBuilding();
			configBuilder.addTablesDbBuilding();
			configBuilder.addEnrichmentsGraphBuilding();
			configBuilder.addCorrelationsGraphBuilding();
	
			const siemjConfContent = configBuilder.build();
			return {'packagesRoot': rootFolder, 'configContent':siemjConfContent};
		});
	}
}
