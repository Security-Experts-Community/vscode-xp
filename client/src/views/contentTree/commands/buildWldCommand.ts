import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { ProcessHelper } from '../../../helpers/processHelper';
import { SiemjConfigHelper } from '../../../models/siemj/siemjConfigHelper';
import { SiemJOutputParser } from '../../../models/siemj/siemJOutputParser';
import { Configuration } from '../../../models/configuration';
import { SiemjConfBuilder } from '../../../models/siemj/siemjConfigBuilder';
import { XpException } from '../../../models/xpException';
import { DialogHelper } from '../../../helpers/dialogHelper';
import { SiemjManager } from '../../../models/siemj/siemjManager';
import { ViewCommand } from './viewCommand';
import { Log } from '../../../extension';

/**
 * Команда выполняющая сборку формул нормализации
 */
export class BuildWldCommand extends ViewCommand {
	constructor(private config: Configuration, private outputParser: SiemJOutputParser) {
		super();
	}

	public async execute() : Promise<void> {
		Log.info(this.config.getMessage("View.ObjectTree.Progress.BuildAllWlds"));

		return vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: true,
			title: this.config.getMessage("View.ObjectTree.Progress.BuildAllWlds")
		}, async (progress, cancellationToken: vscode.CancellationToken) => {

			await SiemjConfigHelper.clearArtifacts(this.config);
			
			// Если в правиле используются сабрули, тогда собираем весь граф корреляций.
			const siemjConfContents = this.getParamsForAllRoots(this.config);
			
			this.config.getDiagnosticCollection().clear();
			
			for (const siemjConfContentEntity of siemjConfContents) {

				const siemjConfContent = siemjConfContentEntity['configContent'];
				if(!siemjConfContent) {
					throw new XpException("Не удалось сгенерировать siemj.conf для заданного правила и тестов");
				}

				// Для сборки WLD нам нужен файл схемы, собираем его.
				const rootFolder = siemjConfContentEntity['packagesRoot'];

				const siemjManager = new SiemjManager(this.config, cancellationToken);
				const contentRootPath = path.join(this.config.getKbFullPath(), rootFolder);
				const siemjExecutionResult = await siemjManager.executeSiemjConfig(contentRootPath, siemjConfContent);
				const result = await this.outputParser.parse(siemjExecutionResult.output);

				// Типовая команда выглядит так:
				// .\ptsiem-sdk\release-26.0\26.0.11839\vc150\x86_64\win\cli/rcc.exe --lang w --taxonomy=.\taxonomy\release-26.0\26.0.215\any\any\any/taxonomy.json --schema=.\gui_output/schema.json -o c:\tmp\whitelisting_graph.json .\knowledgebase\packages
				const rccCli = this.config.getRccCli();
				const taxonomyPath = this.config.getTaxonomyFullPath();
				const schemaPath = this.config.getSchemaFullPath(rootFolder);
				const whitelistingPath = this.config.getWhitelistingPath(rootFolder);
				const rootPath = siemjConfContentEntity['rootPath'];
				const executionResult = await ProcessHelper.execute(
					rccCli,[
						// --lang w
						"--lang", "w",
						// --taxonomy=.\taxonomy\release-26.0\26.0.215\any\any\any/taxonomy.json
						`--taxonomy=${taxonomyPath}`,
						// --schema=.\gui_output/schema.json
						`--schema=${schemaPath}`,
						// -o c:\tmp\whitelisting_graph.json 
						"-o", whitelistingPath,
						rootPath
						// .\knowledgebase\packages
					],
					{
						encoding: "utf-8",
						outputChannel: this.config.getOutputChannel(),
						cancellationToken: cancellationToken
					}
				);

				if(cancellationToken.isCancellationRequested) {
					DialogHelper.showInfo(this.config.getMessage("OperationWasAbortedByUser"));
					return;
				}

				if(executionResult.exitCode != 0) {
					DialogHelper.showError("Ошибка сборки wld-файлов. [Смотри Output](command:xp.commonCommands.showOutputChannel)");
					return;
				}

				DialogHelper.showInfo(`Компиляция wld-файлов успешно завершена`);
			}
		});
	}

	private getParamsForAllRoots(config : Configuration) : any[] {
		const rootPaths = config.getContentRoots();

		return rootPaths.map(rootPath => { 
			const rootFolder = path.basename(rootPath);
			const outputDirectory = config.getOutputDirectoryPath(rootFolder);
			if(!fs.existsSync(outputDirectory)) {
				fs.mkdirSync(outputDirectory, {recursive: true});
			}

			const configBuilder = new SiemjConfBuilder(config, rootPath);
			configBuilder.addTablesSchemaBuilding();
	
			const siemjConfContent = configBuilder.build();
			return {'packagesRoot': rootFolder, 'rootPath': rootPath, 'configContent': siemjConfContent};
		});
	}
}
