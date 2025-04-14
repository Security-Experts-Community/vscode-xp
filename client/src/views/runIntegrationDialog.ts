import * as path from 'path';
import * as vscode from 'vscode';

import { TestHelper } from '../helpers/testHelper';
import { Correlation } from '../models/content/correlation';
import { RuleBaseItem } from '../models/content/ruleBaseItem';
import {
  CompilationType,
  IntegrationTestRunnerOptions
} from '../models/tests/integrationTestRunner';
import { Enrichment } from '../models/content/enrichment';
import { FileSystemHelper } from '../helpers/fileSystemHelper';
import { Configuration } from '../models/configuration';
import { OperationCanceledException } from '../models/operationCanceledException';
import { XpException } from '../models/xpException';
import { DialogHelper } from '../helpers/dialogHelper';
import { Log } from '../extension';
import { RegExpHelper } from '../helpers/regExpHelper';
import { Aggregation } from '../models/content/aggregation';

export class RunIntegrationTestDialog {
  constructor(
    private config: Configuration,
    private options?: { tmpFilesPath?: string; cancellationToken: vscode.CancellationToken }
  ) {}

  public async getIntegrationTestRunOptionsForSingleRule(
    rule: RuleBaseItem
  ): Promise<IntegrationTestRunnerOptions> {
    try {
      if (rule instanceof Correlation) {
        // Либо автоматически найдем зависимости корреляции, либо спросим у пользователя.
        return this.getCorrelationOptionsForSingleRule(rule);
      }

      if (rule instanceof Enrichment) {
        // Уточняем у пользователя, что необходимо скомпилировать для тестов обогащения.
        return this.getEnrichmentOptionsForSingleRule(rule);
      }

      if (rule instanceof Aggregation) {
        // Ничего для агрегация компилировать не надо
        const options = new IntegrationTestRunnerOptions();
        options.correlationCompilation = CompilationType.DontCompile;
        options.tmpFilesPath = this.options.tmpFilesPath;
        return options;
      }

      throw new XpException(
        'Для заданного типа контента не поддерживается получение настроек интеграционных тестов'
      );
    } catch (error) {
      throw new XpException('Ошибка анализа правила на зависимые корреляции');
    }
  }

  private async getCorrelationOptionsForSingleRule(
    rule: Correlation
  ): Promise<IntegrationTestRunnerOptions> {
    const testRunnerOptions = new IntegrationTestRunnerOptions();
    testRunnerOptions.tmpFilesPath = this.options.tmpFilesPath;

    // Получение сабрулей из кода.
    const ruleCode = await rule.getRuleCode();
    const subRuleNames = TestHelper.parseSubRuleNamesFromKnownOperation(ruleCode).map((srn) =>
      srn.toLocaleLowerCase()
    );
    const uniqueSubRuleNames = [...new Set(subRuleNames)];

    const subRulePaths = await this.getRecursiveSubRulePaths(rule);
    const uniqueSubRulePaths = [...new Set(subRulePaths)];
    if (uniqueSubRuleNames.length !== 0) {
      Log.info(
        `Из правила корреляции ${rule.getName()} получены следующие вспомогательные правила (subrule):`,
        uniqueSubRulePaths.map((sp) => path.basename(sp))
      );
    }

    testRunnerOptions.correlationCompilation = CompilationType.Auto;
    // Не забываем путь к самой корреляции.
    testRunnerOptions.dependentCorrelations.push(rule.getDirectoryPath());
    testRunnerOptions.dependentCorrelations.push(...uniqueSubRulePaths);

    testRunnerOptions.currPackagePath = rule.getPackagePath(this.config);
    return testRunnerOptions;

    // Если сабрули, для которых пути не найдены.
    // const result = await DialogHelper.showInfo(
    // 	`Пути к некоторым [вспомогательным правилам (subrule)](https://help.ptsecurity.com/ru-RU/projects/siem/8.1/help/1492811787) обнаружить не удалось, возможно ошибка в правила. Хотите скомпилировать корреляции из текущего пакета или их всех пакетов?`,
    // 	this.CURRENT_PACKAGE,
    // 	this.ALL_PACKAGES);

    // if(!result) {
    // 	throw new OperationCanceledException(this.config.getMessage("OperationWasAbortedByUser"));
    // }

    // switch(result) {
    // 	case this.CURRENT_PACKAGE: {
    // 		testRunnerOptions.dependentCorrelations.push(rule.getPackagePath(this.config));
    // 		break;
    // 	}

    // 	case this.ALL_PACKAGES: {
    // 		const contentRootPath = this.config.getRootByPath(rule.getDirectoryPath());
    // 		testRunnerOptions.dependentCorrelations.push(contentRootPath);
    // 		break;
    // 	}
    // }

    // return testRunnerOptions;
  }

  private async getRecursiveSubRulePaths(rule: Correlation): Promise<string[]> {
    const ruleCode = await rule.getRuleCode();
    const subRuleNames = TestHelper.parseSubRuleNamesFromKnownOperation(ruleCode).map((srn) =>
      srn.toLocaleLowerCase()
    );
    const uniqueParsedSubRuleNames = [...new Set(subRuleNames)];
    if (uniqueParsedSubRuleNames.length === 0) {
      return [];
    }

    // Ищем сабрули в текущем для правиле пакете
    const currentPackagePath = rule.getPackagePath(this.config);
    let subRulePaths = FileSystemHelper.getRecursiveDirPathByName(
      currentPackagePath,
      uniqueParsedSubRuleNames
    );
    if (uniqueParsedSubRuleNames.length !== subRulePaths.length) {
      const subRulesNotFound = uniqueParsedSubRuleNames.filter((x) => !subRulePaths.includes(x));
      Log.debug(
        `Не удалось найти вспомогательные правила ${subRulesNotFound.join(', ')} в пакете ${currentPackagePath}`
      );

      // Ищем сабрули во всех пакетах
      const contentRootPath = this.config.getRootByPath(rule.getDirectoryPath());
      subRulePaths = FileSystemHelper.getRecursiveDirPathByName(
        contentRootPath,
        uniqueParsedSubRuleNames
      );

      if (uniqueParsedSubRuleNames.length !== subRulePaths.length) {
        const foundedSubruleNamesSet = new Set(
          subRulePaths.map((p) => path.basename(p).toLocaleLowerCase())
        );
        const ruleNamesNotFound = [...uniqueParsedSubRuleNames].filter(
          (x) => !foundedSubruleNamesSet.has(x)
        );
        throw new XpException(
          `Не удалось найти вспомогательные правила: ${ruleNamesNotFound.join(', ')}`
        );
      }
    }

    if (this.options.cancellationToken.isCancellationRequested) {
      throw new OperationCanceledException(this.config.getMessage('OperationWasAbortedByUser'));
    }

    for (const subRulePath of subRulePaths) {
      const subrule = await Correlation.parseFromDirectory(subRulePath);
      const subRuleNames = await this.getRecursiveSubRulePaths(subrule);
      subRulePaths.push(...subRuleNames);
    }

    return subRulePaths;
  }

  /**
   *
   * TODO: если в обогащении NotFromCorrelation или correlation_name == null, то зависимых корреляций и обогащения нет.
   * TODO: если correlation_name != null или correlation_name == "ruleName", in_list и т.д. тогда корреляции
   * @param rule
   * @returns
   */
  private async getEnrichmentOptionsForSingleRule(
    rule: Enrichment
  ): Promise<IntegrationTestRunnerOptions> {
    const testRunnerOptions = new IntegrationTestRunnerOptions();
    testRunnerOptions.tmpFilesPath = this.options.tmpFilesPath;

    // Получаем список зависимых корреляции на основании поля correlation_name из блока expect.
    const depRules: string[] = [];
    for (const it of rule.getIntegrationTests()) {
      const testCode = it.getTestCode();
      const expectEvent = RegExpHelper.getSingleExpectEvent(testCode);
      if (!expectEvent) {
        continue;
      }

      let expectEventObject: any;
      try {
        expectEventObject = JSON.parse(expectEvent);
      } catch (error) {
        Log.warn('Ошибка парсинга ожидаемого события', error);
        continue;
      }

      if (expectEventObject?.correlation_name) {
        depRules.push(expectEventObject?.correlation_name);
      }
    }

    const uniqueDepRuleNames = [...new Set(depRules)].map((srn) => srn.toLocaleLowerCase());
    if (uniqueDepRuleNames.length !== 0) {
      Log.info(
        `Из правила обогащения ${rule.getName()} получены следующие зависимые правила:`,
        depRules
      );
    }

    const contentRootPath = this.config.getRootByPath(rule.getDirectoryPath());
    const depRulePaths = FileSystemHelper.getRecursiveDirPathByName(
      contentRootPath,
      uniqueDepRuleNames
    );

    //
    if (uniqueDepRuleNames.length !== depRulePaths.length && uniqueDepRuleNames.length !== 0) {
      const foundedSubruleNamesSet = new Set(
        depRulePaths.map((p) => path.basename(p).toLocaleLowerCase())
      );
      const ruleNamesNotFound = [...uniqueDepRuleNames].filter(
        (x) => !foundedSubruleNamesSet.has(x)
      );
      throw new XpException(
        `Не удалось найти зависимые от обогащения правила: ${ruleNamesNotFound.join(', ')}`
      );
    }

    const uniqueDepRulePaths = depRulePaths;
    for (const depRulePath of depRulePaths) {
      const depRule = await Correlation.parseFromDirectory(depRulePath);
      const depRuleNames = await this.getRecursiveSubRulePaths(depRule);
      uniqueDepRulePaths.push(...depRuleNames);
    }

    // Возвращаем список зависимых от обогащения корреляций.
    if (uniqueDepRulePaths.length === 0) {
      testRunnerOptions.correlationCompilation = CompilationType.CurrentPackage;
    } else {
      testRunnerOptions.correlationCompilation = CompilationType.Auto;
    }

    testRunnerOptions.dependentCorrelations.push(...uniqueDepRulePaths);
    testRunnerOptions.currPackagePath = rule.getPackagePath(this.config);
    return testRunnerOptions;
  }

  private async askTheUser(ruleName: string): Promise<string> {
    const result = await DialogHelper.showInfo(
      this.config.getMessage(
        'View.ObjectTree.Message.ContentChecking.ChoosingEnrichmentCompilation',
        ruleName
      ),
      this.config.getMessage(
        'View.ObjectTree.Message.ContentChecking.ChoosingCorrelationCompilation.CurrentPackage'
      ),
      this.config.getMessage(
        'View.ObjectTree.Message.ContentChecking.ChoosingCorrelationCompilation.DontCompile'
      )
    );

    if (!result) {
      throw new OperationCanceledException(this.config.getMessage('OperationWasAbortedByUser'));
    }

    return result;
  }
}
