import * as vscode from 'vscode';
import * as fs from 'fs';

import { DialogHelper } from '../../../helpers/dialogHelper';
import { Correlation } from '../../../models/content/correlation';
import { ContentItemStatus, RuleBaseItem } from '../../../models/content/ruleBaseItem';
import { ContentTreeProvider } from '../contentTreeProvider';
import { TestHelper } from '../../../helpers/testHelper';
import { LocalizationExample } from '../../../models/content/localization';
import { SiemjManager } from '../../../models/siemj/siemjManager';
import { XpException } from '../../../models/xpException';
import { Configuration } from '../../../models/configuration';
import { LocalizationEditorViewProvider } from '../../localizationEditor/localizationEditorViewProvider';
import { OperationCanceledException } from '../../../models/operationCanceledException';
import { RunIntegrationTestDialog } from '../../runIntegrationDialog';
import { SiemJOutputParser } from '../../../models/siemj/siemJOutputParser';
import { IntegrationTestRunner } from '../../../models/tests/integrationTestRunner';
import { ContentTreeBaseItem } from '../../../models/content/contentTreeBaseItem';
import { ExceptionHelper } from '../../../helpers/exceptionHelper';

/**
 * Проверяет контент по требованиям. В настоящий момент реализована только проверка интеграционных тестов и локализаций.
 * TODO: учесть обновление дерева контента пользователем во время операции.
 * TODO: после обновления дерева статусы item-ам присваиваться не будут, нужно обновить список обрабатываемых рулей.
 */
export class ContentVerifierCommand {
	constructor(
		private readonly _config: Configuration
	) { }

	async execute(parentItem: ContentTreeBaseItem) {
		this._integrationTestTmpFilesPath = this._config.getRandTmpSubDirectoryPath();

		return await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: true,
		}, async (progress, token) => {

			// Сбрасываем статус правил в исходный
			// TODO: Добавить поддержку других типов
			const items = parentItem.getChildren();
			const rules = items.filter(i => (i instanceof Correlation)).map<RuleBaseItem>(r => r as RuleBaseItem);
			for(const rule of rules) {
				rule.setStatus(ContentItemStatus.Default);
			}

			try {
				for(const rule of rules) {
					progress.report({ message: `Проверка правила ${rule.getName()}`});
					await this.testRule(rule, progress, token);
					await ContentTreeProvider.refresh(rule);
				}

				DialogHelper.showInfo(`Проверка директории ${parentItem.getName()} завершена`);
			}
			catch(error) {
				ExceptionHelper.show(error, "Неожиданная ошибка проверки контента");
			}
		});

		// TODO: Удалить временную директорию this._integrationTestTmpFilesPath
	}

	private async testRule(rule: RuleBaseItem, progress: any, cancellationToken: vscode.CancellationToken) {
		progress.report({ message: `Получение зависимостей правила ${rule.getName()} для корректной сборки графа корреляций` });
		const ritd = new RunIntegrationTestDialog(this._config, this._integrationTestTmpFilesPath);
		const options = await ritd.getIntegrationTestRunOptions(rule);
		options.cancellationToken = cancellationToken;

		progress.report({ message: `Проверка интеграционных тестов правила ${rule.getName()}`});
		const outputParser = new SiemJOutputParser();
		const testRunner = new IntegrationTestRunner(this._config, outputParser);

		// TODO: исключить лишнюю сборку артефактов
		const siemjResult = await testRunner.run(rule, options);

		if (!siemjResult.testsStatus) {
			rule.setStatus(ContentItemStatus.Unverified, "Интеграционные тесты не прошли проверку");
			return;
		}

		progress.report({ message: `Проверка локализаций правила ${rule.getName()}`});
		const siemjManager = new SiemjManager(this._config);
		const locExamples = await siemjManager.buildLocalizationExamples(rule, this._integrationTestTmpFilesPath);

		if (locExamples.length === 0) {
			rule.setStatus(ContentItemStatus.Unverified, "Локализации не были получены");
			return;
		}

		const verifiedLocalization = locExamples.some(le => TestHelper.isDefaultLocalization(le.ruText));
		if(verifiedLocalization) {
			rule.setStatus(ContentItemStatus.Unverified, "Локализации не прошли проверку");
		} else {
			rule.setStatus(ContentItemStatus.Verified, "Локализации прошли проверку");
		}

		rule.setLocalizationExamples(locExamples);
	}

	private _integrationTestTmpFilesPath: string
}