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

export class BuildWldCommand {
	constructor(private _config: Configuration, private _outputParser: SiemJOutputParser) {}

	public async execute() : Promise<void> {

		return vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: false,
			title: `Компиляция wld-файлов`
		}, async (progress, cancellationToken: vscode.CancellationToken) => {

			await SiemjConfigHelper.clearArtifacts(this._config);
			
			// Если в правиле используются сабрули, тогда собираем весь граф корреляций.
			const siemjConfContents = this.getParamsForAllRoots(this._config);
			
			this._config.getDiagnosticCollection().clear();
			
			for (const siemjConfContentEntity of siemjConfContents) {

				const siemjConfContent = siemjConfContentEntity['configContent'];
				if(!siemjConfContent) {
					throw new XpException("Не удалось сгенерировать siemj.conf для заданного правила и тестов.");
				}

				// Для сборки WLD нам нужен файл схемы, собираем его.
				const rootFolder = siemjConfContentEntity['packagesRoot'];

				const siemjManager = new SiemjManager(this._config, cancellationToken);
				const contentRootPath = path.join(this._config.getKbFullPath(), rootFolder);
				const siemjExecutionResult = await siemjManager.executeSiemjConfig(contentRootPath, siemjConfContent);
				const result = await this._outputParser.parse(siemjExecutionResult.output);

				// Типовая команда выглядит так:
				// .\ptsiem-sdk\release-26.0\26.0.11839\vc150\x86_64\win\cli/rcc.exe --lang w --taxonomy=.\taxonomy\release-26.0\26.0.215\any\any\any/taxonomy.json --schema=.\gui_output/schema.json -o c:\tmp\whitelisting_graph.json .\knowledgebase\packages
				const rccCli = this._config.getRccCli();
				const taxonomyPath = this._config.getTaxonomyFullPath();
				const schemaPath = this._config.getSchemaFullPath(rootFolder);
				const whitelistingPath = this._config.getWhitelistingPath(rootFolder);
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
						outputChannel: this._config.getOutputChannel()
					}
				);

				if(executionResult.exitCode != 0) {
					DialogHelper.showError("Ошибка сборки wld-файлов");
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
