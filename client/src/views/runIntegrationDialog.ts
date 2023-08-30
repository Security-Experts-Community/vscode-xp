import * as vscode from 'vscode';
import * as path from 'path';

import { ExceptionHelper } from '../helpers/exceptionHelper';
import { TestHelper } from '../helpers/testHelper';
import { Correlation } from '../models/content/correlation';
import { RuleBaseItem } from '../models/content/ruleBaseItem';
import { CompilationType, IntegrationTestRunnerOptions } from '../models/tests/integrationTestRunner';
import { Enrichment } from '../models/content/enrichment';
import { FileSystemHelper } from '../helpers/fileSystemHelper';
import { Configuration } from '../models/configuration';
import { OperationCanceledException } from '../models/operationCanceledException';

export class RunIntegrationTestDialog {
	constructor(private _config : Configuration) {}

	public async getIntegrationTestRunOptions(rule: RuleBaseItem) : Promise<IntegrationTestRunnerOptions> {
		try {
			// Уточняем у пользователя, что необходимо скомпилировать для тестов корреляции.
			const ruleCode = await rule.getRuleCode();

			const testRunnerOptions = new IntegrationTestRunnerOptions();
			testRunnerOptions.keepTmpFiles = true;


			if(rule instanceof Correlation) {
				const subRuleNames = TestHelper.parseSubRuleNames(ruleCode).map(srn => srn.toLocaleLowerCase());

				if(subRuleNames.length != 0) {
					const currentPackagePath = rule.getPackagePath(this._config);
					const currPackgeSubRulePaths = FileSystemHelper.getRecursiveDirPathByName(currentPackagePath, subRuleNames);

					// Все сабрули нашли в текущем пакете.
					if(currPackgeSubRulePaths.length === subRuleNames.length) {
						testRunnerOptions.correlationCompilation = CompilationType.Auto;
						testRunnerOptions.dependentCorrelation.push(...currPackgeSubRulePaths);

						// Не забываем путь к самой корреляции.
						testRunnerOptions.dependentCorrelation.push(rule.getDirectoryPath());
						return testRunnerOptions;
					}
					
					// Ищем сабрули во всех пакетах.
					// TODO: надо перечислять пакеты и у них смотреть вложенные директории кроме штатных.
					const contentRootPath = this._config.getRootByPath(rule.getDirectoryPath());
					const rootDirectorySubRulePaths = FileSystemHelper.getRecursiveDirPathByName(contentRootPath, subRuleNames);

					// Нашли пути ко всем сабрулям в других пакетах.
					if(rootDirectorySubRulePaths.length === subRuleNames.length) {
						testRunnerOptions.correlationCompilation = CompilationType.Auto;
						testRunnerOptions.dependentCorrelation.push(...rootDirectorySubRulePaths);

						// Не забываем путь к самой корреляции.
						testRunnerOptions.dependentCorrelation.push(rule.getDirectoryPath());
						return testRunnerOptions;
					}

					// Те сабрули, которые не смогли найти.
					const subRulesNotFound = subRuleNames.filter(x => !rootDirectorySubRulePaths.includes(x));

					// Если сабрули, для которых пути не найдены.
					const result = await vscode.window.showInformationMessage(
						`Пути к сабрулям ${subRulesNotFound.join(", ")} обнаружить не удалось, возможно ошибка в правила. Хотите скомпилировать корреляции из текущего пакета или их всех пакетов?`,
						this.CURRENT_PACKAGE,
						this.ALL_PACKAGES);

					if(!result) {
						throw new OperationCanceledException("Операция отменена.");
					}
					
					switch(result) {
						case this.CURRENT_PACKAGE: {
							testRunnerOptions.dependentCorrelation.push(rule.getPackagePath(this._config));
							break;
						}

						case this.ALL_PACKAGES: {
							testRunnerOptions.dependentCorrelation.push(contentRootPath);
							break;
						}
					}
				} 
				
			}

			// TODO: если в обогащении NotFromCorrelation или correlation_name == null, то зависимых корреляций и обогащения нет.
			// TODO: если correlation_name != null или correlation_name == "ruleName", in_list и т.д. тогда корреляции

			// Уточняем у пользователя, что необходимо скомпилировать для тестов обогащения.
			if(rule instanceof Enrichment) {
				const result = await vscode.window.showInformationMessage(
					"Тестируемое правило обогащения может обогащать как нормализованные события, так и корреляционные. Хотите скомпилировать корреляции из текущего пакета или их всех пакетов?",
					this.CURRENT_PACKAGE,
					this.ALL_PACKAGES);

				if(!result) {
					throw new OperationCanceledException("Операция отменена.");
				}
				
				switch(result) {
					case this.CURRENT_PACKAGE: {
						testRunnerOptions.correlationCompilation = CompilationType.CurrentPackage;
						break;
					}

					case this.ALL_PACKAGES: {
						testRunnerOptions.correlationCompilation = CompilationType.AllPackages;
						break;
					}
				}

				return testRunnerOptions;
			}
		}
		catch(error) {
			ExceptionHelper.show(error, 'Ошибка анализа корреляции на зависимости');
		}
	}

	public ALL_PACKAGES = "Все пакеты";
	public CURRENT_PACKAGE = "Текущий пакет"
}