import * as vscode from 'vscode';

import { TestHelper } from '../helpers/testHelper';
import { Correlation } from '../models/content/correlation';
import { RuleBaseItem } from '../models/content/ruleBaseItem';
import { CompilationType, IntegrationTestRunnerOptions } from '../models/tests/integrationTestRunner';
import { Enrichment } from '../models/content/enrichment';
import { FileSystemHelper } from '../helpers/fileSystemHelper';
import { Configuration } from '../models/configuration';
import { OperationCanceledException } from '../models/operationCanceledException';
import { XpException } from '../models/xpException';

export class RunIntegrationTestDialog {
	constructor(private _config : Configuration) {}

	public async getIntegrationTestRunOptions(rule: RuleBaseItem) : Promise<IntegrationTestRunnerOptions> {
		try {
			if(rule instanceof Correlation) {
				// Либо автоматически найдем зависимости корреляции, либо спросим у пользователя.
				return this.getCorrelationOptions(rule);
			}

			if(rule instanceof Enrichment) {
				// Уточняем у пользователя, что необходимо скомпилировать для тестов обогащения.
				return this.getEnrichmentOptions(rule);
			}

			throw new XpException('Для заданного типа контента не поддерживается получение настроек интеграционных тестов.');
		}
		catch(error) {
			throw new XpException('Ошибка анализа правила на зависимые корреляции');
		}
	}

	private async getCorrelationOptions(rule : Correlation) : Promise<IntegrationTestRunnerOptions> {
		const testRunnerOptions = new IntegrationTestRunnerOptions();
		testRunnerOptions.keepTmpFiles = true;

		const ruleCode = await rule.getRuleCode();
		const subRuleNames = TestHelper.parseSubRuleNames(ruleCode).map(srn => srn.toLocaleLowerCase());
		const uniqueSubRuleNames = [...new Set(subRuleNames)];

		// У правила нет зависимых корреляций, собираем только его.
		if(uniqueSubRuleNames.length == 0) {
			testRunnerOptions.correlationCompilation = CompilationType.CurrentRule;
			return testRunnerOptions;
		}

		const currentPackagePath = rule.getPackagePath(this._config);
		const currPackageSubRulePaths = FileSystemHelper.getRecursiveDirPathByName(currentPackagePath, uniqueSubRuleNames);

		// Все сабрули нашли в текущем пакете.
		if(currPackageSubRulePaths.length === uniqueSubRuleNames.length) {
			testRunnerOptions.correlationCompilation = CompilationType.Auto;
			testRunnerOptions.dependentCorrelations.push(...currPackageSubRulePaths);

			// Не забываем путь к самой корреляции.
			testRunnerOptions.dependentCorrelations.push(rule.getDirectoryPath());
			return testRunnerOptions;
		}
		
		// Ищем сабрули во всех пакетах.
		const contentRootPath = this._config.getRootByPath(rule.getDirectoryPath());
		const rootDirectorySubRulePaths = FileSystemHelper.getRecursiveDirPathByName(contentRootPath, uniqueSubRuleNames);

		// Нашли пути ко всем сабрулям в других пакетах.
		if(rootDirectorySubRulePaths.length === uniqueSubRuleNames.length) {
			testRunnerOptions.correlationCompilation = CompilationType.Auto;
			testRunnerOptions.dependentCorrelations.push(...rootDirectorySubRulePaths);

			// Не забываем путь к самой корреляции.
			testRunnerOptions.dependentCorrelations.push(rule.getDirectoryPath());
			return testRunnerOptions;
		}

		// Те сабрули, которые не смогли найти.
		const subRulesNotFound = uniqueSubRuleNames.filter(x => !rootDirectorySubRulePaths.includes(x));

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
				testRunnerOptions.dependentCorrelations.push(rule.getPackagePath(this._config));
				break;
			}

			case this.ALL_PACKAGES: {
				testRunnerOptions.dependentCorrelations.push(contentRootPath);
				break;
			}
		}

		return testRunnerOptions;
	}

	/**
	 * 
	 * TODO: если в обогащении NotFromCorrelation или correlation_name == null, то зависимых корреляций и обогащения нет.
	 * TODO: если correlation_name != null или correlation_name == "ruleName", in_list и т.д. тогда корреляции
	 * @param rule 
	 * @returns 
	 */
	private async getEnrichmentOptions(rule : Enrichment) : Promise<IntegrationTestRunnerOptions> {
		const testRunnerOptions = new IntegrationTestRunnerOptions();
		testRunnerOptions.keepTmpFiles = true;

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

	public ALL_PACKAGES = "Все пакеты";
	public CURRENT_PACKAGE = "Текущий пакет"
}