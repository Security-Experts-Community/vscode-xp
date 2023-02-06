import * as fs from 'fs';
import * as vscode from 'vscode';
import { ExtensionHelper } from '../../../helpers/extensionHelper';

import { ProcessHelper } from '../../../helpers/processHelper';
import { SiemjConfigHelper } from '../../../helpers/siemjConfigHelper';
import { SiemJOutputParser } from '../../integrationTests/siemJOutputParser';
import { Configuration } from '../../../models/configuration';
import { ExceptionHelper } from '../../../helpers/exceptionHelper';

export class BuildAllGraphsAction {
	constructor(private _config: Configuration, private _outputParser: SiemJOutputParser) {
	}

	public async run() : Promise<void> {

		return vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: false,
			title: `Сбор графов`
		}, async (progress) => {
			try {
				// Если в правиле используются сабрули, тогда собираем весь граф корреляций.
				const siemjConfContents = SiemjConfigHelper.getBuildAllGraphs(this._config);
	
				// Очищаем и показываем окно Output.
				this._config.getOutputChannel().clear();
				this._config.getDiagnosticCollection().clear();
				
				for (const siemjConfContent of siemjConfContents){
					if(!siemjConfContent) {
						ExtensionHelper.showUserError("Не удалось сгенерировать siemj.conf для заданного правила и тестов.");
						return;
					}

					const siemjConfigPath = this._config.getTmpSiemjConfigPath();
					// Централизованно сохраняем конфигурационный файл для siemj.
					await SiemjConfigHelper.saveSiemjConfig(siemjConfContent, siemjConfigPath);

					// Типовая команда выглядит так:
					// "C:\\Work\\-=SIEM=-\\PTSIEMSDK_GUI.4.0.0.738\\tools\\siemj.exe" -c C:\\Work\\-=SIEM=-\\PTSIEMSDK_GUI.4.0.0.738\\temp\\siemj.conf main
					const siemjExePath = this._config.getSiemjPath();
					const siemJOutput = await ProcessHelper.ExecuteWithArgsWithRealtimeOutput(
						siemjExePath,
						["-c", siemjConfigPath, "main"],
						this._config.getOutputChannel());

					if(!siemJOutput.includes(this.SUCCESS_EXIT_CODE_SUBSTRING)) {
						ExtensionHelper.showUserInfo("Все графы успешно собраны.");
					} else {
						ExtensionHelper.showUserError("Ошибка сбора графов. Смотри Output.");
					}

					// Добавляем новые строки, чтобы разделить разные запуски утилиты
					this._config.getOutputChannel().append('\n\n\n');
					this._config.getOutputChannel().show();

					// Разбираем вывод SiemJ и корректируем начало строки с диагностикой (исключаем пробельные символы)
					let ruleFileDiagnostics = this._outputParser.parse(siemJOutput);
					ruleFileDiagnostics = await this._outputParser.correctDiagnosticBeginCharRanges(ruleFileDiagnostics);

					// Выводим ошибки и замечания для тестируемого правила.
					for (const rfd of ruleFileDiagnostics) {
						this._config.getDiagnosticCollection().set(rfd.Uri, rfd.Diagnostics);
					}
				}
			}
			catch(error) {
				ExceptionHelper.show(error, `Ошибка обработки событий`);
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

	private readonly SUCCESS_EXIT_CODE_SUBSTRING = "SUBPROCESS EXIT CODE: 1";
}