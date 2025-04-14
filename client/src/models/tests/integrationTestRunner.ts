import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { SiemjConfigHelper } from '../siemj/siemjConfigHelper';
import { SiemJOutputParser, SiemjExecutionResult } from '../siemj/siemJOutputParser';
import { Configuration } from '../configuration';
import { RuleBaseItem } from '../content/ruleBaseItem';
import { TestStatus } from './testStatus';
import { SiemjConfBuilder } from '../siemj/siemjConfigBuilder';
import { XpException } from '../xpException';
import { SiemjManager } from '../siemj/siemjManager';
import { OperationCanceledException } from '../operationCanceledException';
import { VsCodeApiHelper } from '../../helpers/vsCodeApiHelper';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { KbHelper } from '../../helpers/kbHelper';
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
    private outputParser: SiemJOutputParser
  ) {}

  public async compileArtifacts(
    options: IntegrationTestRunnerOptions
  ): Promise<SiemjExecutionResult> {
    this.options = options;
    // Проверяем наличие нужных утилит.
    this.config.getSiemkbTestsPath();

    await SiemjConfigHelper.clearArtifacts(this.config);

    const contentRoot = this.config.getContentRoots()[0];
    const rootFolder = path.basename(contentRoot);
    const outputDirPath = this.config.getOutputDirectoryPath(rootFolder);
    if (!fs.existsSync(outputDirPath)) {
      await fs.promises.mkdir(outputDirPath, { recursive: true });
    }

    const configBuilder = new SiemjConfBuilder(this.config, contentRoot);
    const gitApi = await VsCodeApiHelper.getGitExtension();
    if (!gitApi) {
      // Нет git-а - пересобираем все нормализации.
      configBuilder.addNormalizationsGraphBuilding(true);
    } else {
      // Есть хоть одна измененная нормализация, пересобираем все.
      if (VsCodeApiHelper.isWorkDirectoryUsingGit(gitApi, contentRoot)) {
        const changePaths = VsCodeApiHelper.gitWorkingTreeChanges(gitApi, contentRoot);
        const isNormalizationsChanged = changePaths.some((cp) => cp.endsWith('.xp'));
        if (isNormalizationsChanged) {
          configBuilder.addNormalizationsGraphBuilding(true);
        } else {
          configBuilder.addNormalizationsGraphBuilding(false);
        }
      } else {
        configBuilder.addNormalizationsGraphBuilding(true);
      }
    }

    configBuilder.addAggregationGraphBuilding();
    configBuilder.addTablesSchemaBuilding();
    configBuilder.addTablesDbBuilding();
    configBuilder.addEnrichmentsGraphBuilding();

    // Параметры сборки графа корреляций в зависимости от опций.
    switch (options.correlationCompilation) {
      case CompilationType.CurrentPackage: {
        // Надо собрать весь пакет, но у нас могут быть внешние зависимости.
        // Исключаем точечные зависимости из пакета, оставляя внешние.
        const correlationPaths = options.dependentCorrelations.filter(
          (depCorrPath) => !depCorrPath.startsWith(options.currPackagePath)
        );
        correlationPaths.push(options.currPackagePath);
        configBuilder.addCorrelationsGraphBuilding(true, correlationPaths);
        break;
      }
      case CompilationType.AllPackages: {
        configBuilder.addCorrelationsGraphBuilding(true);
        break;
      }
      case CompilationType.Auto: {
        const dependentCorrelations = options.dependentCorrelations;
        if (dependentCorrelations.length === 0) {
          throw new XpException('Опции запуска интеграционных тестов неконсистентны');
        }

        configBuilder.addCorrelationsGraphBuilding(true, options.dependentCorrelations);
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

    const siemjManager = new SiemjManager(this.config, this.options.cancellationToken);
    const siemjConfContent = configBuilder.build();
    const siemjExecutionResult = await siemjManager.executeSiemjConfig(
      contentRoot,
      siemjConfContent
    );
    if (siemjExecutionResult.isInterrupted) {
      throw new OperationCanceledException(this.config.getMessage('OperationWasAbortedByUser'));
    }

    const siemjResult = await this.outputParser.parse(siemjExecutionResult.output);
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

    const configBuilder = new SiemjConfBuilder(this.config, rootPath);

    // TODO: временно отключена генерация временных файлов, так как siemkb_tests.exe падает со следующей ошибкой:
    // TEST_RULES :: log4cplus:ERROR Unable to open file: C:\Users\user\AppData\Local\Temp\eXtraction and Processing\tmp\5239e794-c14a-7526-113c-52479c1694d6\AdAstra_TraceMode_File_Suspect_Operation_Inst_Fldr\2024-04-18_19-06-45_unknown_sdk_227gsqqu\AdAstra_TraceMode_File_Suspect_Operation_Inst_Fldr\tests\raw_events_4_norm_enr.log
    // TEST_RULES :: Error: SDK: Cannot open fpta db C:\Users\user\AppData\Local\Temp\eXtraction and Processing\tmp\5239e794-c14a-7526-113c-52479c1694d6\AdAstra_TraceMode_File_Suspect_Operation_Inst_Fldr\2024-04-18_19-06-45_unknown_sdk_227gsqqu\AdAstra_TraceMode_File_Suspect_Operation_Inst_Fldr\tests\raw_events_4_fpta.db : it's not exists

    // const testTmpDirectory = path.join(this.options.tmpFilesPath, rule.getName());
    // configBuilder.addTestsRun(rule.getDirectoryPath(), testTmpDirectory);

    configBuilder.addTestsRun(rule.getDirectoryPath(), this.options.tmpFilesPath);

    const siemjConfContent = configBuilder.build();
    if (!siemjConfContent) {
      throw new XpException(this.config.getMessage('CouldNotGenerateSiemjConf'));
    }

    const siemjManager = new SiemjManager(this.config, this.options.cancellationToken);
    const siemjExecutionResult = await siemjManager.executeSiemjConfigForRule(
      rule,
      siemjConfContent
    );

    if (siemjExecutionResult.isInterrupted) {
      throw new OperationCanceledException(this.config.getMessage('OperationWasAbortedByUser'));
    }

    const siemjResult = await this.outputParser.parse(siemjExecutionResult.output);

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

    await SiemjConfigHelper.clearArtifacts(this.config);

    const rootPath = rule.getContentRootPath(this.config);
    const rootFolder = path.basename(rootPath);
    const outputDirPath = this.config.getOutputDirectoryPath(rootFolder);
    if (!fs.existsSync(outputDirPath)) {
      await fs.promises.mkdir(outputDirPath, { recursive: true });
    }

    const configBuilder = new SiemjConfBuilder(this.config, rootPath);

    const gitApi = await VsCodeApiHelper.getGitExtension();
    if (!gitApi) {
      // Нет git-а - пересобираем все нормализации.
      configBuilder.addNormalizationsGraphBuilding(true);
    } else {
      // Есть хоть одна измененная нормализация, пересобираем все.
      if (VsCodeApiHelper.isWorkDirectoryUsingGit(gitApi, rootPath)) {
        const changePaths = VsCodeApiHelper.gitWorkingTreeChanges(gitApi, rootPath);
        const isNormalizationsChanged = changePaths.some((cp) => cp.endsWith('.xp'));
        if (isNormalizationsChanged) {
          configBuilder.addNormalizationsGraphBuilding(true);
        } else {
          configBuilder.addNormalizationsGraphBuilding(false);
        }
      } else {
        configBuilder.addNormalizationsGraphBuilding(true);
      }
    }

    configBuilder.addAggregationGraphBuilding();
    configBuilder.addTablesSchemaBuilding();
    configBuilder.addTablesDbBuilding();
    configBuilder.addEnrichmentsGraphBuilding();

    // Параметры сборки графа корреляций в зависимости от опций.
    switch (options.correlationCompilation) {
      case CompilationType.CurrentRule: {
        configBuilder.addCorrelationsGraphBuilding(true, rule.getDirectoryPath());
        break;
      }
      case CompilationType.CurrentPackage: {
        configBuilder.addCorrelationsGraphBuilding(true, rule.getPackagePath(this.config));
        break;
      }
      case CompilationType.AllPackages: {
        configBuilder.addCorrelationsGraphBuilding(true);
        break;
      }
      case CompilationType.Auto: {
        const dependentCorrelations = options.dependentCorrelations;
        if (dependentCorrelations.length === 0) {
          throw new XpException('Опции запуска интеграционных тестов неконсистентны');
        }

        configBuilder.addCorrelationsGraphBuilding(true, options.dependentCorrelations);
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

    // Получаем путь к директории с результатами теста.
    configBuilder.addTestsRun(rule.getDirectoryPath(), options.tmpFilesPath);
    const siemjConfContent = configBuilder.build();
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

    const siemjResult = await this.outputParser.parse(siemjExecutionResult.output);

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
}
