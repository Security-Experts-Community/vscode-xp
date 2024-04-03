import * as vscode from 'vscode';

import { Command, CommandParams } from '../../models/command/command';
import { TestHelper } from '../../helpers/testHelper';
import { DialogHelper } from '../../helpers/dialogHelper';
import { RunIntegrationTestDialog } from '../runIntegrationDialog';
import { SiemJOutputParser } from '../../models/siemj/siemJOutputParser';
import { IntegrationTestRunner } from '../../models/tests/integrationTestRunner';
import { TestStatus } from '../../models/tests/testStatus';
import { ContentItemStatus } from '../../models/content/ruleBaseItem';
import { Log } from '../../extension';
import { ContentTreeProvider } from '../contentTree/contentTreeProvider';

export class RunIntegrationTestsCommand extends Command {

	constructor(private params: CommandParams) {
		super();
	}
	
	public async execute(): Promise<boolean> {
		return vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: true,
		}, async (progress, cancellationToken: vscode.CancellationToken) => {

			Log.info(`Запущены интеграционные тесты для правила ${this.params.rule.getName()}`);

			const tests = this.params.rule.getIntegrationTests();
			if (tests.length == 0) {
				DialogHelper.showInfo(`Тесты для правила '${this.params.rule.getName()}' не найдены. Добавьте хотя бы один тест и повторите`);
				return false;
			}

			// Уточняем информацию для пользователей если в правиле обнаружено использование сабрулей.
			const ruleCode = await this.params.rule.getRuleCode();
			if (TestHelper.isRuleCodeContainsSubrules(ruleCode)) {
				progress.report({
					message: `Интеграционные тесты для правила ${this.params.rule.getName()} с вспомогательными правилами (subrules)`
				});
			} else {
				progress.report({
					message: `Интеграционные тесты для правила ${this.params.rule.getName()}`
				});
			}

			const ritd = new RunIntegrationTestDialog(this.params.config, this.params.tmpDirPath);
			const testRunnerOptions = await ritd.getIntegrationTestRunOptions(this.params.rule);
			testRunnerOptions.cancellationToken = cancellationToken;

			const outputParser = new SiemJOutputParser();
			const testRunner = new IntegrationTestRunner(this.params.config, outputParser);
			const siemjResult = await testRunner.run(this.params.rule, testRunnerOptions);

			this.params.config.resetDiagnostics(siemjResult.fileDiagnostics);

			const executedIntegrationTests = this.params.rule.getIntegrationTests();
			if(executedIntegrationTests.every(it => it.getStatus() === TestStatus.Success)) {
				// Задаём и обновляем статус элемента дерева
				this.params.rule.setStatus(ContentItemStatus.Verified, "Интеграционные тесты пройдены");

				DialogHelper.showInfo(`Интеграционные тесты правила '${this.params.rule.getName()}' прошли успешно`);
				await ContentTreeProvider.refresh(this.params.rule);
				return true;
			} 

			if(executedIntegrationTests.some(it => it.getStatus() === TestStatus.Success)) {
				this.params.rule.setStatus(ContentItemStatus.Unverified, "Интеграционные тесты не пройдены");

				DialogHelper.showInfo(`Не все тесты правила '${this.params.rule.getName()}' прошли успешно`);
				await ContentTreeProvider.refresh(this.params.rule);
				return true;
			} 

			this.params.rule.setStatus(ContentItemStatus.Default);
			DialogHelper.showError(`Все тесты не были пройдены. Возможно наличие синтаксических ошибок в коде правила или его зависимостях. [Смотри Output](command:xp.commonCommands.showOutputChannel)`);
			ContentTreeProvider.refresh(this.params.rule);
			return true;
		});
	}
}
