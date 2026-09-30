import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { SiemjConfigHelper } from '../siemj/siemjConfigHelper';
import { SiemjExecutionResult } from '../siemj/siemJOutputParser';

import { Configuration } from '../configuration';
import { RuleBaseItem } from '../content/ruleBaseItem';
import { TestStatus } from './testStatus';
import { AbstractSiemjConfBuilder } from '../siemj/siemjConfigBuilder';
import { XpException } from '../xpException';
import { SiemjManager } from '../siemj/siemjManager';
import { OperationCanceledException } from '../operationCanceledException';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { RegExpHelper } from '../../helpers/regExpHelper';
import { BuildArtifactsCache, BuildArtifactType } from '../siemj/buildArtifactsCache';
import { Log } from '../../extension';

export enum CompilationType {
  DontCompile = 'DontCompile',
  CurrentRule = 'CurrentRule',
  CurrentPackage = 'CurrentPackage',
  AllPackages = 'AllPackages',
  Auto = 'Auto'
}

export class IntegrationTestRunnerOptions {
  tmpFilesPath?: string;
  currPackagePath?: string;
  dependentCorrelations: string[] = [];
  correlationCompilation: CompilationType = CompilationType.Auto;
  cancellationToken?: vscode.CancellationToken;
  public union(right: IntegrationTestRunnerOptions): IntegrationTestRunnerOptions {
    for (const rdc of right.dependentCorrelations) {
      if (!this.dependentCorrelations.includes(rdc)) {
        this.dependentCorrelations.push(rdc);
      }
    }

    this.currPackagePath = right.currPackagePath;
    this.correlationCompilation = right.correlationCompilation;

    return this;
  }
}

export class IntegrationTestRunner {
  private options: IntegrationTestRunnerOptions;

  constructor(
    private config: Configuration,
    private configBuilder: AbstractSiemjConfBuilder
  ) {}

  public async compileArtifacts(
    options: IntegrationTestRunnerOptions
  ): Promise<SiemjExecutionResult> {
    this.options = options;
    // Проверяем наличие нужных утилит.
    this.config.getSiemkbTestsPath();

    await SiemjConfigHelper.clearArtifacts(this.config, { keepTablesDb: true });

    const contentRoot = this.config.getContentRoots()[0];
    const rootFolder = path.basename(contentRoot);
    const outputDirPath = this.config.getOutputDirectoryPath(rootFolder);
    if (!fs.existsSync(outputDirPath)) {
      await fs.promises.mkdir(outputDirPath, { recursive: true });
    }

    const siemjManager = new SiemjManager(this.config, this.options.cancellationToken);
    this.configBuilder = siemjManager.getConfigBuilder(contentRoot);

    // Параметры сборки графа корреляций в зависимости от опций.
    let correlationsSrc: string[] | undefined;
    switch (options.correlationCompilation) {
      case CompilationType.CurrentPackage: {
        // Надо собрать весь пакет, но у нас могут быть внешние зависимости.
        // Исключаем точечные зависимости из пакета, оставляя внешние.
        correlationsSrc = options.dependentCorrelations.filter(
          (depCorrPath) => !depCorrPath.startsWith(options.currPackagePath)
        );
        correlationsSrc.push(options.currPackagePath);
        break;
      }
      case CompilationType.AllPackages: {
        correlationsSrc = [contentRoot];
        break;
      }
      case CompilationType.Auto: {
        const dependentCorrelations = options.dependentCorrelations;
        if (dependentCorrelations.length === 0) {
          throw new XpException('Опции запуска интеграционных тестов неконсистентны');
        }

        correlationsSrc = options.dependentCorrelations;
        break;
      }
      case CompilationType.DontCompile: {
        // Если мы не собираем граф корреляции, то нужно создать пустой json-файл, чтобы siemj не ругался.
        const corrGraphFilePath = this.config.getCorrelationsGraphFilePath(rootFolder);
        await FileSystemHelper.writeContentFile(corrGraphFilePath, '{}');
        break;
      }
      default: {
        throw new XpException('Опции запуска интеграционных тестов неконсистентны');
      }
    }

    const buildCache = await this.addArtifactsBuilding(contentRoot, correlationsSrc);
    if (!buildCache.hasArtifactsToBuild()) {
      Log.info('All graphs and table lists are up to date, building is skipped');
      const upToDateResult = new SiemjExecutionResult();
      upToDateResult.testsStatus = true;
      return upToDateResult;
    }

    const siemjConfContent = this.configBuilder.build();
    const siemjExecutionResult = await siemjManager.executeSiemjConfig(
      contentRoot,
      siemjConfContent
    );
    if (siemjExecutionResult.isInterrupted) {
      throw new OperationCanceledException(this.config.getMessage('OperationWasAbortedByUser'));
    }

    const outputParser = this.configBuilder.getOutputParser();

    const siemjResult = await outputParser.parse(siemjExecutionResult.output);
    await buildCache.commit(siemjResult);
    return siemjResult;
  }

  public async run(rule: RuleBaseItem): Promise<SiemjExecutionResult> {
    // Проверяем наличие нужных утилит.
    this.config.getSiemkbTestsPath();

    const integrationTests = rule.getIntegrationTests();
    integrationTests.forEach((it) => it.setStatus(TestStatus.Unknown));

    if (integrationTests.length == 0) {
      throw new XpException(`У правила ${rule.getName()} не найдено интеграционных тестов`);
    }

    // Хотя бы у одного теста есть сырые события и код теста.
    const atLeastOneTestIsValid = integrationTests.some((it) => {
      if (!it.getRawEvents()) {
        return false;
      }

      if (!it.getTestCode()) {
        return false;
      }

      return true;
    });

    if (!atLeastOneTestIsValid) {
      throw new XpException('Для запуска тестов нужно добавить сырые события и код теста');
    }

    const rootPath = this.config.getContentRoots()[0];
    const rootFolder = path.basename(rootPath);
    const outputDirPath = this.config.getOutputDirectoryPath(rootFolder);
    if (!fs.existsSync(outputDirPath)) {
      await fs.promises.mkdir(outputDirPath, { recursive: true });
    }

    const siemjManager = new SiemjManager(this.config, this.options.cancellationToken);
    this.configBuilder = siemjManager.getConfigBuilder(rootPath);
    this.configBuilder.addTestsRun(rule.getDirectoryPath(), this.options.tmpFilesPath);

    const siemjConfContent = this.configBuilder.build();
    if (!siemjConfContent) {
      throw new XpException(this.config.getMessage('CouldNotGenerateSiemjConf'));
    }

    const siemjExecutionResult = await siemjManager.executeSiemjConfigForRule(
      rule,
      siemjConfContent
    );

    if (siemjExecutionResult.isInterrupted) {
      throw new OperationCanceledException(this.config.getMessage('OperationWasAbortedByUser'));
    }

    const outputParser = this.configBuilder.getOutputParser();
    const siemjResult = await outputParser.parse(siemjExecutionResult.output);

    const executedTests = rule.getIntegrationTests();
    // Все тесты прошли, статусы не проверяем, все тесты зеленые.
    if (siemjResult.testsStatus) {
      executedTests.forEach((it) => it.setStatus(TestStatus.Success));

      // Убираем ошибки по текущему правилу.
      const ruleFileUri = vscode.Uri.file(rule.getRuleFilePath());
      this.config.getDiagnosticCollection().set(ruleFileUri, []);
    } else {
      // Есть ошибки, все неуспешные тесты не прошли.
      executedTests
        .filter((it) => it.getStatus() === TestStatus.Success)
        .forEach((it) => it.setStatus(TestStatus.Failed));
    }

    // Если были не прошедшие тесты, выводим статус.
    // Непрошедшие тесты могу отсутствовать, если до тестов дело не дошло.
    if (siemjResult.failedTestNumbers.length > 0) {
      for (const failedTestNumber of siemjResult.failedTestNumbers) {
        executedTests[failedTestNumber - 1].setStatus(TestStatus.Failed);
      }

      executedTests.forEach((it) => {
        if (it.getStatus() == TestStatus.Unknown) {
          it.setStatus(TestStatus.Success);
        }
      });
    }

    return siemjResult;
  }

  public async runOnce(
    rule: RuleBaseItem,
    options?: IntegrationTestRunnerOptions
  ): Promise<SiemjExecutionResult> {
    // Проверяем наличие нужных утилит.
    this.config.getSiemkbTestsPath();

    const integrationTests = rule.getIntegrationTests();
    integrationTests.forEach((it) => it.setStatus(TestStatus.Unknown));

    if (integrationTests.length == 0) {
      throw new XpException(`У правила ${rule.getName()} не найдено интеграционных тестов`);
    }

    // Хотя бы у одного теста есть сырые события и код теста.
    const atLeastOneTestIsValid = integrationTests.some((it) => {
      if (!it.getRawEvents()) {
        return false;
      }

      if (!it.getTestCode()) {
        return false;
      }

      return true;
    });

    if (!atLeastOneTestIsValid) {
      throw new XpException(
        'Для запуска тестов нужно добавить сырые события и условия выполнения теста'
      );
    }

    await SiemjConfigHelper.clearArtifacts(this.config, { keepTablesDb: true });

    const rootPath = rule.getContentRootPath(this.config);
    const rootFolder = path.basename(rootPath);
    const outputDirPath = this.config.getOutputDirectoryPath(rootFolder);
    if (!fs.existsSync(outputDirPath)) {
      await fs.promises.mkdir(outputDirPath, { recursive: true });
    }

    // Параметры сборки графа корреляций в зависимости от опций.
    let correlationsSrc: string[] | undefined;
    switch (options.correlationCompilation) {
      case CompilationType.CurrentRule: {
        correlationsSrc = [rule.getDirectoryPath()];
        break;
      }
      case CompilationType.CurrentPackage: {
        correlationsSrc = [rule.getPackagePath(this.config)];
        break;
      }
      case CompilationType.AllPackages: {
        correlationsSrc = [rootPath];
        break;
      }
      case CompilationType.Auto: {
        const dependentCorrelations = options.dependentCorrelations;
        if (dependentCorrelations.length === 0) {
          throw new XpException('Опции запуска интеграционных тестов неконсистентны');
        }

        correlationsSrc = options.dependentCorrelations;
        break;
      }
      case CompilationType.DontCompile: {
        // Если мы не собираем граф корреляции, то нужно создать пустой json-файл, чтобы siemj не ругался.
        const corrGraphFilePath = this.config.getCorrelationsGraphFilePath(rootFolder);
        await FileSystemHelper.writeContentFile(corrGraphFilePath, '{}');
        break;
      }
      default: {
        throw new XpException('Опции запуска интеграционных тестов неконсистентны');
      }
    }

    const buildCache = await this.addArtifactsBuilding(rootPath, correlationsSrc);

    // Получаем путь к директории с результатами теста.
    this.configBuilder.addTestsRun(rule.getDirectoryPath(), options.tmpFilesPath);
    const siemjConfContent = this.configBuilder.build();
    if (!siemjConfContent) {
      throw new XpException(this.config.getMessage('CouldNotGenerateSiemjConf'));
    }

    const siemjManager = new SiemjManager(this.config, options.cancellationToken);
    const siemjExecutionResult = await siemjManager.executeSiemjConfigForRule(
      rule,
      siemjConfContent
    );
    const executedTests = rule.getIntegrationTests();

    if (siemjExecutionResult.isInterrupted) {
      throw new OperationCanceledException(this.config.getMessage('OperationWasAbortedByUser'));
    }

    const outputParser = this.configBuilder.getOutputParser();
    const siemjResult = await outputParser.parse(siemjExecutionResult.output);
    await buildCache.commit(siemjResult);
    var testRuleFiles = RegExpHelper.getEnrichedCorrTestEventsFileNameNew(siemjResult.rawOutput);
    executedTests.forEach((test) =>
      test.setResultFiles(testRuleFiles.get(test.getNumber().toString()))
    );
    // Все тесты прошли, статусы не проверяем, все тесты зеленые.
    if (siemjResult.testsStatus) {
      executedTests.forEach((it) => it.setStatus(TestStatus.Success));

      // Убираем ошибки по текущему правилу.
      const ruleFileUri = vscode.Uri.file(rule.getRuleFilePath());
      this.config.getDiagnosticCollection().set(ruleFileUri, []);
    } else {
      // Есть ошибки, все неуспешные тесты не прошли.
      executedTests
        .filter((it) => it.getStatus() === TestStatus.Success)
        .forEach((it) => it.setStatus(TestStatus.Failed));
    }

    // Если были не прошедшие тесты, выводим статус.
    // Непрошедшие тесты могу отсутствовать, если до тестов дело не дошло.
    if (siemjResult.failedTestNumbers.length > 0) {
      for (const failedTestNumber of siemjResult.failedTestNumbers) {
        executedTests[failedTestNumber - 1].setStatus(TestStatus.Failed);
      }

      executedTests.forEach((it) => {
        if (it.getStatus() == TestStatus.Unknown) {
          it.setStatus(TestStatus.Success);
        }
      });
    }

    return siemjResult;
  }

  /**
   * Добавляет в конфиг siemj сборку только тех графов и табличных списков,
   * исходные файлы которых изменились с момента предыдущей сборки.
   * @param correlationsSrc пути для сборки графа корреляций, undefined — граф корреляций не собирается.
   */
  private async addArtifactsBuilding(
    rootPath: string,
    correlationsSrc?: string[]
  ): Promise<BuildArtifactsCache> {
    const buildCache = await BuildArtifactsCache.create(this.config, rootPath, correlationsSrc);
    await buildCache.removeStaleArtifacts();

    if (buildCache.needsBuild(BuildArtifactType.Normalizations)) {
      this.configBuilder.addNormalizationsGraphBuilding(true);
    }
    if (buildCache.needsBuild(BuildArtifactType.Aggregations)) {
      this.configBuilder.addAggregationGraphBuilding();
    }
    if (buildCache.needsBuild(BuildArtifactType.TablesSchema)) {
      this.configBuilder.addTablesSchemaBuilding();
    }
    if (buildCache.needsBuild(BuildArtifactType.TablesDb)) {
      this.configBuilder.addTablesDbBuilding();
    }
    if (buildCache.needsBuild(BuildArtifactType.Enrichments)) {
      this.configBuilder.addEnrichmentsGraphBuilding();
    }
    if (correlationsSrc && buildCache.needsBuild(BuildArtifactType.Correlations)) {
      this.configBuilder.addCorrelationsGraphBuilding(true, correlationsSrc);
    }

    return buildCache;
  }
}
