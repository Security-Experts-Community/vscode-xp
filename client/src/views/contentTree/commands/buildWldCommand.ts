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

export class BuildWldCommand {
	constructor(private _config: Configuration, private _outputParser: SiemJOutputParser) {}

	public async execute() : Promise<void> {

		return vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: false,
			title: `Компиляция wld-файлов`
		}, async (progress) => {

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
				const siemjConfigPath = this._config.getTmpSiemjConfigPath(rootFolder);
				await SiemjConfigHelper.saveSiemjConfig(siemjConfContent, siemjConfigPath);

				// Типовая команда выглядит так:
				// "C:\\PTSIEMSDK_GUI.4.0.0.738\\tools\\siemj.exe" -c C:\\PTSIEMSDK_GUI.4.0.0.738\\temp\\siemj.conf main
				const siemjExePath = this._config.getSiemjPath();
				const siemJOutput = await ProcessHelper.execute(
					siemjExePath,
					["-c", siemjConfigPath, "main"],
					{
						encoding: this._config.getSiemjOutputEncoding(),
						outputChannel: this._config.getOutputChannel()
					}
				);

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

	private getParamsForAllRoots(config : Configuration ) : any[] {
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
