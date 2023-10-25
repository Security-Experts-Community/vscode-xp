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
import { DialogHelper } from '../helpers/dialogHelper';
import { Log } from '../extension';
import { RegExpHelper } from '../helpers/regExpHelper';

export class RunIntegrationTestDialog {
	constructor(private _config : Configuration, private _tmpFilesPath?: string) {}

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

			throw new XpException('Для заданного типа контента не поддерживается получение настроек интеграционных тестов');
		}
		catch(error) {
			throw new XpException('Ошибка анализа правила на зависимые корреляции');
		}
	}

	private async getCorrelationOptions(rule : Correlation) : Promise<IntegrationTestRunnerOptions> {
		const testRunnerOptions = new IntegrationTestRunnerOptions();
		testRunnerOptions.tmpFilesPath = this._tmpFilesPath;

		// Получение сабрулей из кода.
		const ruleCode = await rule.getRuleCode();
		const subRuleNames = TestHelper.parseSubRuleNames(ruleCode).map(srn => srn.toLocaleLowerCase());
		const uniqueSubRuleNames = [...new Set(subRuleNames)];

		// У правила нет зависимых корреляций, собираем только его.
		if(uniqueSubRuleNames.length == 0) {
			testRunnerOptions.correlationCompilation = CompilationType.CurrentRule;
			return testRunnerOptions;
		}

		Log.info(`Из правила ${rule.getName()} получены следующие подправила (subrules): `, uniqueSubRuleNames);

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
		const result = await DialogHelper.showInfo(
			`Пути к сабрулям ${subRulesNotFound.join(", ")} обнаружить не удалось, возможно ошибка в правила. Хотите скомпилировать корреляции из текущего пакета или их всех пакетов?`,
			this.CURRENT_PACKAGE,
			this.ALL_PACKAGES);

		if(!result) {
			throw new OperationCanceledException("Операция отменена");
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
		testRunnerOptions.tmpFilesPath = this._tmpFilesPath;

		// TODO: экспериментальная оптимизация
		const ruleCode = await rule.getRuleCode();
		const events = RegExpHelper.getAllStrings(ruleCode, /event\s*(\w+)\s*:/gm);

		// Одно событие, значит если там проверяется отсутствие в фильтре правила корреляции, то можно граф корреляции не собирать.
		if(events.length === 1) {
			const corrNameFilter = RegExpHelper.getAllStrings(ruleCode, /filter\s+{[\s\S]+?(correlation_name\s+==\s+null|filter::NotFromCorrelator\s*\(\))[\s\S]+?}/gm);
			if(corrNameFilter.length === 1) {
				testRunnerOptions.correlationCompilation = CompilationType.DontCompile;
				return testRunnerOptions;
			} 
		} 

		const result = await this.askTheUser();
		
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

	private async askTheUser(): Promise<string> {
		const result = await DialogHelper.showInfo(
			"Правило обогащения может обогащать как нормализованные события, так и корреляционные. Хотите скомпилировать корреляции из текущего пакета или их всех пакетов?",
			this.CURRENT_PACKAGE,
			this.ALL_PACKAGES);

		if(!result) {
			throw new OperationCanceledException("Операция отменена");
		}

		return result;
	}

	public ALL_PACKAGES = "Все пакеты";
	public CURRENT_PACKAGE = "Текущий пакет"
}