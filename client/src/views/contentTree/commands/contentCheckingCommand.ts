import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { DialogHelper } from '../../../helpers/dialogHelper';
import { Correlation } from '../../../models/content/correlation';
import { ContentItemStatus, RuleBaseItem } from '../../../models/content/ruleBaseItem';
import { ContentTreeProvider } from '../contentTreeProvider';
import { Configuration } from '../../../models/configuration';
import { RunIntegrationTestDialog } from '../../runIntegrationDialog';
import { SiemJOutputParser } from '../../../models/siemj/siemJOutputParser';
import {
  CompilationType,
  IntegrationTestRunner,
  IntegrationTestRunnerOptions
} from '../../../models/tests/integrationTestRunner';
import { ContentTreeBaseItem } from '../../../models/content/contentTreeBaseItem';
import { Enrichment } from '../../../models/content/enrichment';
import { Log } from '../../../extension';
import { Normalization } from '../../../models/content/normalization';
import { TestStatus } from '../../../models/tests/testStatus';
import { BaseUnitTest } from '../../../models/tests/baseUnitTest';
import { OperationCanceledException } from '../../../models/operationCanceledException';
import { StringHelper } from '../../../helpers/stringHelper';
import { ParserHelper } from '../../../helpers/parserHelper';
import { ViewCommand } from '../../../models/command/command';
import { SiemjManager } from '../../../models/siemj/siemjManager';
import { TestHelper } from '../../../helpers/testHelper';
import { BuildLocalizationsCommand } from './buildLocalizationsCommand';
import { Aggregation } from '../../../models/content/aggregation';

/**
 * Проверяет контент по требованиям. В настоящий момент реализована только проверка интеграционных тестов и локализаций.
 * TODO: учесть обновление дерева контента пользователем во время операции.
 * TODO: после обновления дерева статусы item-ам присваиваться не будут, нужно обновить список обрабатываемых рулей.
 */
export class ContentCheckingCommand extends ViewCommand {
  constructor(
    private readonly config: Configuration,
    private selectedItem: ContentTreeBaseItem
  ) {
    super();
  }

  async execute(): Promise<void> {
    this.integrationTestTmpFilesPath = this.config.getRandTmpSubDirectoryPath();

    return await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: true
      },
      async (progress, token) => {
        let totalChildItems: ContentTreeBaseItem[] = [];

        // Либо выбрана директория, либо конкретное правило.
        if (this.selectedItem.isFolder()) {
          totalChildItems = this.getChildrenRecursively(this.selectedItem, token);
        } else {
          totalChildItems.push(this.selectedItem);
        }

        const rules = totalChildItems
          .filter((i) => i instanceof RuleBaseItem)
          .map<RuleBaseItem>((r) => r as RuleBaseItem);
        if (rules.length === 0) {
          DialogHelper.showInfo(
            `В директории ${this.selectedItem.getName()} не найдено контента для проверки`
          );
          return;
        }

        const testRunner = await this.buildAllArtifacts(rules, {
          progress: progress,
          cancellationToken: token
        });

        let thereAreRulesWithLocalizations = false;
        for (const rule of rules) {
          // Игнорируем все, кроме правил корреляции, обогащения и нормализации
          if (
            !(rule instanceof Correlation) &&
            !(rule instanceof Enrichment) &&
            !(rule instanceof Normalization) &&
            !(rule instanceof Aggregation)
          ) {
            continue;
          }

          if (rule instanceof Normalization) {
            await this.checkNormalization(rule, {
              progress: progress,
              cancellationToken: token
            });
            // Можно собирать локализации, они должны быть в правиле
            thereAreRulesWithLocalizations = true;
          }

          if (rule instanceof Correlation) {
            await this.checkCorrelation(rule, testRunner, {
              progress: progress,
              cancellationToken: token
            });

            // Можно собирать локализации, они должны быть в правиле
            thereAreRulesWithLocalizations = true;
          }

          if (rule instanceof Enrichment) {
            await this.checkEnrichment(rule, testRunner, {
              progress: progress,
              cancellationToken: token
            });
          }

          if (rule instanceof Aggregation) {
            await this.checkAggregation(rule, testRunner, {
              progress: progress,
              cancellationToken: token
            });
          }

          await ContentTreeProvider.refresh(rule);
        }

        // Проверка локализаций
        if (thereAreRulesWithLocalizations) {
          const parser = new SiemJOutputParser(this.config);
          const command = new BuildLocalizationsCommand(this.config, {
            outputParser: parser,
            localizationsPath: this.selectedItem.getDirectoryPath()
            // TODO: добавить использования прогресса как параметра, чтобы не появлялось дополнительный прогресс
          });
          await command.execute();
        }
      }
    );
  }

  private async buildAllArtifacts(
    rules: RuleBaseItem[],
    options: { progress: any; cancellationToken: vscode.CancellationToken }
  ): Promise<IntegrationTestRunner> {
    const unionOptions = new IntegrationTestRunnerOptions();
    unionOptions.tmpFilesPath = this.integrationTestTmpFilesPath;
    unionOptions.cancellationToken = options.cancellationToken;

    // Собираем обобщенные настройки для компиляции графа корреляции.
    let correlationBuildingConfigured = false;
    let enrichmentBuildingConfigured = false;
    let aggregationBuildingConfigured = false;
    for (const rule of rules) {
      // Сбрасываем статус для правила в дереве объектов.
      rule.setStatus(ContentItemStatus.Default);
      ContentTreeProvider.refresh(rule);
      const ritd = new RunIntegrationTestDialog(this.config, {
        cancellationToken: options.cancellationToken
      });

      if (options.cancellationToken.isCancellationRequested) {
        throw new OperationCanceledException(this.config.getMessage('OperationWasAbortedByUser'));
      }

      const statusMessage = this.config.getMessage(
        'View.ObjectTree.Progress.ContentChecking.GetDependencies',
        rule.getName()
      );
      Log.info(statusMessage);
      options.progress.report({ message: statusMessage });

      if (rule instanceof Correlation) {
        const ruleRunOptions = await ritd.getIntegrationTestRunOptionsForSingleRule(rule);
        unionOptions.union(ruleRunOptions);

        correlationBuildingConfigured = true;
      }

      if (rule instanceof Enrichment) {
        const ruleRunOptions = await ritd.getIntegrationTestRunOptionsForSingleRule(rule);
        unionOptions.union(ruleRunOptions);

        enrichmentBuildingConfigured = true;
      }

      if (rule instanceof Aggregation) {
        const ruleRunOptions = await ritd.getIntegrationTestRunOptionsForSingleRule(rule);
        unionOptions.union(ruleRunOptions);

        aggregationBuildingConfigured = true;
      }
    }

    const outputParser = new SiemJOutputParser(this.config);
    const testRunner = new IntegrationTestRunner(this.config, outputParser);

    if (
      correlationBuildingConfigured ||
      enrichmentBuildingConfigured ||
      aggregationBuildingConfigured
    ) {
      const statusMessage = this.config.getMessage(
        'View.ObjectTree.Progress.ContentChecking.BuildAllArtifacts'
      );
      Log.info(statusMessage);
      options.progress.report({ message: statusMessage });

      await testRunner.compileArtifacts(unionOptions);
    }

    // TODO: проверить результаты сборки артефактов
    return testRunner;
  }

  private async enrichmentBuildingConfigurationForAllEnrichment(
    rule: Enrichment
  ): Promise<IntegrationTestRunnerOptions> {
    const testRunnerOptions = new IntegrationTestRunnerOptions();
    const result = await this.askTheUser();

    testRunnerOptions.currPackagePath = rule.getPackagePath(this.config);

    switch (result) {
      case this.config.getMessage(
        'View.ObjectTree.Message.ContentChecking.ChoosingCorrelationCompilation.CurrentPackage'
      ): {
        testRunnerOptions.correlationCompilation = CompilationType.CurrentPackage;
        break;
      }

      case this.config.getMessage(
        'View.ObjectTree.Message.ContentChecking.ChoosingCorrelationCompilation.AllPackages'
      ): {
        testRunnerOptions.correlationCompilation = CompilationType.AllPackages;
        break;
      }

      case this.config.getMessage(
        'View.ObjectTree.Message.ContentChecking.ChoosingCorrelationCompilation.DontCompile'
      ): {
        testRunnerOptions.correlationCompilation = CompilationType.DontCompile;
        break;
      }
    }

    return testRunnerOptions;
  }

  private async askTheUser(): Promise<string> {
    const result = await DialogHelper.showInfo(
      this.config.getMessage(
        'View.ObjectTree.Message.ContentChecking.ChoosingCorrelationCompilation'
      ),
      this.config.getMessage(
        'View.ObjectTree.Message.ContentChecking.ChoosingCorrelationCompilation.CurrentPackage'
      ),
      this.config.getMessage(
        'View.ObjectTree.Message.ContentChecking.ChoosingCorrelationCompilation.DontCompile'
      ),
      this.config.getMessage(
        'View.ObjectTree.Message.ContentChecking.ChoosingCorrelationCompilation.AllPackages'
      )
    );

    if (!result) {
      throw new OperationCanceledException(this.config.getMessage('OperationWasAbortedByUser'));
    }

    return result;
  }

  private async checkNormalization(
    rule: RuleBaseItem,
    options: { progress: any; cancellationToken: vscode.CancellationToken }
  ) {
    const statusMessage = this.config.getMessage(
      'View.ObjectTree.Progress.ContentChecking.NormalizationChecking',
      rule.getName()
    );
    Log.info(statusMessage);
    options.progress.report({ message: statusMessage });

    if (options.cancellationToken.isCancellationRequested) {
      throw new OperationCanceledException(this.config.getMessage('OperationWasAbortedByUser'));
    }

    const tests = rule.getUnitTests();

    // Сбрасываем результаты предыдущих тестов.
    tests.forEach((t) => t.setStatus(TestStatus.Unknown));
    const testHandler = async (unitTest: BaseUnitTest) => {
      const rule = unitTest.getRule();
      const testRunner = rule.getUnitTestRunner();
      return testRunner.run(unitTest);
    };

    // Запускаем все тесты
    for (let test of tests) {
      try {
        test = await testHandler(test);
      } catch (error) {
        test.setStatus(TestStatus.Failed);
        Log.error(error);
      }
    }

    // Проверяем результаты тестов и меняем статус в UI.
    if (tests.every((t) => t.getStatus() === TestStatus.Success)) {
      const message = this.config.getMessage('View.ObjectTree.ItemStatus.TestsPassed');
      Log.debug(message);
      rule.setStatus(ContentItemStatus.Verified, message);
    } else {
      const message = this.config.getMessage('View.ObjectTree.ItemStatus.TestsFailed');
      Log.debug(message);
      rule.setStatus(ContentItemStatus.Unverified, message);
    }
  }

  private async checkCorrelation(
    rule: RuleBaseItem,
    runner: IntegrationTestRunner,
    options: { progress: any; cancellationToken: vscode.CancellationToken }
  ) {
    Log.progress(
      options.progress,
      this.config.getMessage(
        'View.ObjectTree.Progress.ContentChecking.CorrelationChecking',
        rule.getName()
      )
    );

    if (!(await this.checkDirectoryNameEqualRuleName(rule))) {
      return;
    }

    this.checkRuleDescription(rule);

    if (options.cancellationToken.isCancellationRequested) {
      throw new OperationCanceledException(this.config.getMessage('OperationWasAbortedByUser'));
    }

    const siemjResult = await runner.run(rule);
    if (siemjResult.testsStatus) {
      const message = this.config.getMessage('View.ObjectTree.ItemStatus.TestsPassed');
      Log.info(message);
      rule.setStatus(ContentItemStatus.Verified, message);
    } else {
      const message = this.config.getMessage('View.ObjectTree.ItemStatus.TestsFailed');
      Log.info(message);
      rule.setStatus(ContentItemStatus.Unverified, message);
    }

    Log.progress(options.progress, `Проверка локализации правила ${rule.getName()}`);

    // TODO: убрал конкатенацию, так как получается слишком длинный путь для enrichment-cli
    // const ruleTmpFilesRuleName = path.join(this.integrationTestTmpFilesPath, rule.getName());
    // if(!fs.existsSync(ruleTmpFilesRuleName)) {
    // 	throw new XpException("Не найдены результаты выполнения интеграционных тестов");
    // }
    // const locExamples = await siemjManager.buildLocalizationExamplesFromIntegrationTestResult(rule, ruleTmpFilesRuleName);

    const siemjManager = new SiemjManager(this.config, options.cancellationToken);

    const locExamples = await siemjManager.buildLocalizationExamplesFromIntegrationTestResult(
      rule,
      this.integrationTestTmpFilesPath
    );
    if (locExamples.length === 0) {
      rule.setStatus(ContentItemStatus.Unverified, 'Локализации не были получены');
      return;
    }

    const verifiedLocalization = locExamples.some((le) =>
      TestHelper.isDefaultLocalization(le.ruText)
    );
    if (verifiedLocalization) {
      rule.setStatus(
        ContentItemStatus.Unverified,
        'Локализация не прошла проверку, обнаружен пример локализации по умолчанию'
      );
    } else {
      rule.setStatus(
        ContentItemStatus.Verified,
        'Интеграционные тесты и локализации прошли проверку'
      );
    }

    rule.setLocalizationExamples(locExamples);
  }
  private async checkAggregation(
    rule: RuleBaseItem,
    runner: IntegrationTestRunner,
    options: { progress: any; cancellationToken: vscode.CancellationToken }
  ) {
    Log.progress(
      options.progress,
      this.config.getMessage(
        'View.ObjectTree.Progress.ContentChecking.AggregationChecking',
        rule.getName()
      )
    );

    if (!(await this.checkDirectoryNameEqualRuleName(rule))) {
      return;
    }

    this.checkRuleDescription(rule);

    const siemjResult = await runner.run(rule);
    if (siemjResult.testsStatus) {
      const message = this.config.getMessage('View.ObjectTree.ItemStatus.TestsPassed');
      Log.info(message);
      rule.setStatus(ContentItemStatus.Verified, message);
    } else {
      const message = this.config.getMessage('View.ObjectTree.ItemStatus.TestsFailed');
      Log.info(message);
      rule.setStatus(ContentItemStatus.Unverified, message);
    }
  }

  private async checkEnrichment(
    rule: RuleBaseItem,
    runner: IntegrationTestRunner,
    options: { progress: any; cancellationToken: vscode.CancellationToken }
  ) {
    Log.progress(
      options.progress,
      this.config.getMessage(
        'View.ObjectTree.Progress.ContentChecking.EnrichmentChecking',
        rule.getName()
      )
    );

    if (!(await this.checkDirectoryNameEqualRuleName(rule))) {
      return;
    }

    this.checkRuleDescription(rule);

    if (options.cancellationToken.isCancellationRequested) {
      throw new OperationCanceledException(this.config.getMessage('OperationWasAbortedByUser'));
    }

    const siemjResult = await runner.run(rule);
    if (siemjResult.testsStatus) {
      const message = this.config.getMessage('View.ObjectTree.ItemStatus.TestsPassed');
      Log.info(message);
      rule.setStatus(ContentItemStatus.Verified, message);
    } else {
      const message = this.config.getMessage('View.ObjectTree.ItemStatus.TestsFailed');
      Log.info(message);
      rule.setStatus(ContentItemStatus.Unverified, message);
    }
  }

  private getChildrenRecursively(
    parentItem: ContentTreeBaseItem,
    cancellationToken: vscode.CancellationToken
  ): ContentTreeBaseItem[] {
    if (cancellationToken.isCancellationRequested) {
      throw new OperationCanceledException(this.config.getMessage('OperationWasAbortedByUser'));
    }

    const items = parentItem.getChildren();
    const totalItems: ContentTreeBaseItem[] = [];

    totalItems.push(...items);
    for (const item of items) {
      const childItems = this.getChildrenRecursively(item, cancellationToken);
      totalItems.push(...childItems);
    }
    return totalItems;
  }

  private async checkDirectoryNameEqualRuleName(rule: RuleBaseItem): Promise<boolean> {
    const parentPath = rule.getDirectoryPath();
    const directoryName = path.basename(parentPath);
    const ruleNameFromCode = ParserHelper.parseRuleName(await rule.getRuleCode());
    if (!ruleNameFromCode) {
      return true;
    }

    const result = StringHelper.crossPlatformPathCompare(
      directoryName,
      ruleNameFromCode,
      this.config.getOsType()
    );

    if (!result) {
      const message = `В правиле ${ruleNameFromCode} имя директории ${directoryName} отличается от имени правила. Исправьте данную ошибку и повторите`;
      Log.info(message);
      rule.setStatus(ContentItemStatus.Unverified, message);
      return false;
    }

    return true;
  }

  private async checkRuleDescription(rule: RuleBaseItem): Promise<void> {
    if (!rule.getRuDescription() && !rule.getEnDescription()) {
      DialogHelper.showWarning(
        `В правиле ${rule.getName()} отсутствует описание на обоих языках. Исправьте и повторите`
      );
    }
  }

  private integrationTestTmpFilesPath: string;
}
