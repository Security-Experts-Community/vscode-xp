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
import { ViewCommand } from './viewCommand';

/**
 * Команда выполняющая сборку локализаций
 */
export class BuildLocalizationsCommand extends ViewCommand {
	constructor(private config: Configuration, private outputParser: SiemJOutputParser) {
		super();
	}

	public async execute() : Promise<void> {

		return vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: false,
			title: `Компиляция локализаций`
		}, async (progress) => {

			await SiemjConfigHelper.clearArtifacts(this.config);
			
			// Если в правиле используются сабрули, тогда собираем весь граф корреляций.
			const siemjConfContents = this.getParamsForAllRoots(this.config);
			
			this.config.getDiagnosticCollection().clear();
			
			for (const siemjConfContentEntity of siemjConfContents) {

				const rootFolder = siemjConfContentEntity['packagesRoot'];
				const siemjConfContent = siemjConfContentEntity['configContent'];

				if(!siemjConfContent) {
					throw new XpException("Не удалось сгенерировать siemj.conf для заданного правила и тестов");
				}

				// Сохраняем конфигурационный файл для siemj.
				const siemjConfigPath = this.config.getTmpSiemjConfigPath(rootFolder);
				await SiemjConfigHelper.saveSiemjConfig(siemjConfContent, siemjConfigPath);

				// Типовая команда выглядит так:
				// "C:\\PTSIEMSDK_GUI.4.0.0.738\\tools\\siemj.exe" -c C:\\PTSIEMSDK_GUI.4.0.0.738\\temp\\siemj.conf main
				const siemjExePath = this.config.getSiemjPath();
				const siemJOutput = await ProcessHelper.execute(
					siemjExePath,
					["-c", siemjConfigPath, "main"],
					{
						encoding: this.config.getSiemjOutputEncoding(),
						outputChannel: this.config.getOutputChannel()
					}
				);

				// Добавляем новые строки, чтобы разделить разные запуски утилиты
				this.config.getOutputChannel().append('\n\n');

				// Разбираем вывод siemJ и корректируем начало строки с диагностикой (исключаем пробельные символы)
				const result = await this.outputParser.parse(siemJOutput.output);

				// Выводим ошибки и замечания для тестируемого правила.
				for (const rfd of result.fileDiagnostics) {
					this.config.getDiagnosticCollection().set(rfd.uri, rfd.diagnostics);
				}

				if(result.statusMessage) {
					DialogHelper.showError(result.statusMessage);
					return;
				}

				DialogHelper.showInfo(`Компиляция всех локализаций успешно завершена`);
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
			configBuilder.addLocalizationsBuilding();
	
			const siemjConfContent = configBuilder.build();
			return {'packagesRoot': rootFolder, 'configContent': siemjConfContent};
		});
	}
}
