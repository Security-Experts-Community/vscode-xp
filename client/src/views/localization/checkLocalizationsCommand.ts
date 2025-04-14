import * as fs from 'fs';
import * as vscode from 'vscode';

import { TestHelper } from '../../helpers/testHelper';
import { ContentItemStatus } from '../../models/content/ruleBaseItem';
import { DialogHelper } from '../../helpers/dialogHelper';
import { ContentTreeProvider } from '../contentTree/contentTreeProvider';
import { SiemjManager } from '../../models/siemj/siemjManager';
import { XpException } from '../../models/xpException';
import { SiemJOutputParser } from '../../models/siemj/siemJOutputParser';
import { RunIntegrationTestDialog } from '../runIntegrationDialog';
import { LocalizationEditorViewProvider } from './localizationEditorViewProvider';
import { ExceptionHelper } from '../../helpers/exceptionHelper';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { OperationCanceledException } from '../../models/operationCanceledException';
import { RuleCommandParams, ViewCommand } from '../../models/command/command';
import { LocalizationExample } from '../../models/content/localization';
import { Log } from '../../extension';
import { IntegrationTestRunner } from '../../models/tests/integrationTestRunner';
import { Correlation } from '../../models/content/correlation';
import { Normalization } from '../../models/content/normalization';
import { TestStatus } from '../../models/tests/testStatus';
import { BaseUnitTest } from '../../models/tests/baseUnitTest';
// import { UnitTestsListViewProvider } from '../unitTestEditor/unitTestsListViewProvider';

/**
 * Команда выполняющая сборку всех графов: нормализации, агрегации, обогащения и корреляции.
 */
export class CheckLocalizationCommand extends ViewCommand {
  constructor(
    private provider: LocalizationEditorViewProvider,
    private params: RuleCommandParams
  ) {
    super();
  }

  public async execute(): Promise<void> {
    try {
      if (!TestHelper.isTestedLocalizationsRule(this.params.rule)) {
        DialogHelper.showInfo(
          'В настоящий момент поддерживается проверка локализаций только для корреляций. Если вам требуется поддержка других правил, можете добавить или проверить наличие подобного [Issue](https://github.com/Security-Experts-Community/vscode-xp/issues).'
        );
        return;
      }

      this.params.rule.getLocalizations().forEach((localization, index) => {
        this.checkBalanceOfCurlyBraces(index, localization.getRuLocalizationText());
        this.checkBalanceOfCurlyBraces(index, localization.getEnLocalizationText());
      });

      // Сбрасываем статус правила в исходный
      this.params.rule.setStatus(ContentItemStatus.Default);
      await ContentTreeProvider.refresh(this.params.rule);

      const localizations = this.params.message.localizations;
      await this.provider.saveLocalization(localizations, false);

      let locExamples: LocalizationExample[] = [];
      if (this.params.rule instanceof Correlation) {
        locExamples = await this.getLocalizationExamplesForCorrelation();
      }

      if (this.params.rule instanceof Normalization) {
        locExamples = await this.getLocalizationExamplesForNormalization();
      }

      if (locExamples.length === 0) {
        DialogHelper.showInfo(
          'По имеющимся событиям не отработала ни одна локализация. Проверьте, что тесты проходят, корректны критерии локализации. После исправлений повторите'
        );

        this.params.rule.setStatus(
          ContentItemStatus.Unverified,
          'Локализация не прошла проверку, не была сгенерирована ни одна локализация'
        );
      } else {
        const isDefaultLocalization = locExamples.some((le) =>
          TestHelper.isDefaultLocalization(le.ruText)
        );
        if (isDefaultLocalization) {
          DialogHelper.showError(
            'Обнаружена локализация по умолчанию. Исправьте/добавьте нужные критерии локализаций и повторите'
          );
          this.params.rule.setStatus(
            ContentItemStatus.Unverified,
            'Локализация не прошла проверку, обнаружен пример локализации по умолчанию'
          );
        } else {
          this.params.rule.setStatus(
            ContentItemStatus.Verified,
            'Тесты и локализации прошли проверку'
          );
        }
      }

      await ContentTreeProvider.refresh(this.params.rule);

      this.params.rule.setLocalizationExamples(locExamples);
      this.provider.showLocalizationEditor(this.params.rule, true);
    } catch (error) {
      ExceptionHelper.show(error, 'Неожиданная ошибка тестирования локализаций');

      // Если произошла отмена операции, мы не очищаем временные файлы.
      if (error instanceof OperationCanceledException) {
        return;
      }

      try {
        await FileSystemHelper.deleteAllSubDirectoriesAndFiles(this.params.tmpDirPath);
      } catch (error) {
        Log.warn('Error clearing temporary integration test files', error);
      }
    }
  }

  private checkBalanceOfCurlyBraces(localizationNumber: number, localization: string) {
    const numberOfOpeningCurlyBrace = localization.match(/\{/g);
    const numberOfClosingCurlyBrace = localization.match(/\}/g);
    if (
      numberOfOpeningCurlyBrace &&
      numberOfClosingCurlyBrace &&
      numberOfOpeningCurlyBrace.length > numberOfClosingCurlyBrace.length
    ) {
      throw new XpException(
        `Ошибка использования полей таксономии в локализации №${localizationNumber + 1}, не все открывающиеся фигурные скобки имеют соответствующие закрывающиеся`
      );
    }

    if (
      numberOfOpeningCurlyBrace &&
      numberOfClosingCurlyBrace &&
      numberOfOpeningCurlyBrace.length < numberOfClosingCurlyBrace.length
    ) {
      throw new XpException(
        `Ошибка использования полей таксономии в локализации №${localizationNumber + 1}, не все закрывающиеся фигурные скобки имеют соответствующие открывающиеся`
      );
    }
  }

  private async getLocalizationExamplesForCorrelation(): Promise<LocalizationExample[]> {
    return await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: true
      },
      async (progress, token) => {
        let userResponse: string;

        if (fs.existsSync(this.params.tmpDirPath)) {
          const subDirItems = await fs.promises.readdir(this.params.tmpDirPath, {
            withFileTypes: true
          });

          if (subDirItems.length > 0) {
            userResponse = await DialogHelper.showInfo(
              'Обнаружены результаты предыдущего запуска интеграционных тестов. Если вы модифицировали только правила локализации, то можно использовать предыдущие результаты. В противном случае необходимо запустить интеграционные тесты еще раз.',
              CheckLocalizationCommand.USE_OLD_TESTS_RESULT,
              CheckLocalizationCommand.RESTART_TESTS
            );

            // Если пользователь закрыл диалог, завершаем работу.
            if (!userResponse) {
              throw new OperationCanceledException(
                this.params.config.getMessage('OperationWasAbortedByUser')
              );
            }
          }
        }

        if (!userResponse || userResponse === CheckLocalizationCommand.RESTART_TESTS) {
          Log.progress(
            progress,
            `Получение зависимостей правила для корректной сборки графа корреляций`
          );

          const userDialog = new RunIntegrationTestDialog(this.params.config, {
            tmpFilesPath: this.params.tmpDirPath,
            cancellationToken: token
          });
          const options = await userDialog.getIntegrationTestRunOptionsForSingleRule(
            this.params.rule
          );
          options.cancellationToken = token;

          Log.progress(
            progress,
            `Получение корреляционных событий на основе интеграционных тестов правила`
          );

          const outputParser = new SiemJOutputParser(this.params.config);
          const testRunner = new IntegrationTestRunner(this.params.config, outputParser);
          const siemjResult = await testRunner.runOnce(this.params.rule, options);

          if (!siemjResult.testsStatus) {
            throw new XpException(
              'Не все интеграционные тесты прошли. Для получения тестовых локализации необходимо чтобы успешно проходили все интеграционные тесты'
            );
          }
        }

        const locExamples = await this.getLocalization(progress);
        return locExamples;
      }
    );
  }

  private async getLocalizationExamplesForNormalization(): Promise<LocalizationExample[]> {
    return await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: true
      },
      async (progress, token) => {
        // Сбрасываем результаты предыдущих тестов.
        const tests = this.params.rule.getUnitTests();
        tests.forEach((t) => t.setStatus(TestStatus.Unknown));

        const testHandler = async (unitTest: BaseUnitTest) => {
          const testRunner = this.params.rule.getUnitTestRunner();
          return testRunner.run(unitTest, {
            useAppendix: true
          });
        };

        Log.progress(progress, `Выполняются модульные тесты правила ${this.params.rule.getName()}`);

        const testActualResultStrings: string[] = [];
        for (const test of tests) {
          if (token.isCancellationRequested) {
            throw new OperationCanceledException(
              this.params.config.getMessage('OperationWasAbortedByUser')
            );
          }
          const testResult = await testHandler(test);
          if (testResult.getStatus() !== TestStatus.Success) {
            throw new XpException(
              `Тест №${test.getNumber()} не прошёл. Для тестирования локализаций необходимо, чтобы все тесты проходили. Исправьте все тесты и повторите`
            );
          }

          const actualDataString = testResult.getActualData();
          const actualDataObject = JSON.parse(actualDataString);
          const actualDataOneLine = JSON.stringify(actualDataObject);
          testActualResultStrings.push(actualDataOneLine);

          // vscode.commands.executeCommand(UnitTestsListViewProvider.refreshCommand);
        }

        Log.progress(
          progress,
          `Генерируются примеры локализаций правила ${this.params.rule.getName()}`
        );

        const siemjManager = new SiemjManager(this.params.config, token);
        const locExamples = await siemjManager.buildLocalizationExamples(
          this.params.rule,
          testActualResultStrings,
          this.params.tmpDirPath
        );
        return locExamples;
      }
    );
  }

  private async getLocalization(
    progress: vscode.Progress<{ message?: string; increment?: number }>
  ): Promise<LocalizationExample[]> {
    Log.progress(
      progress,
      `Генерация локализаций на основе корреляционных событий из интеграционных тестов`
    );

    const siemjManager = new SiemjManager(this.params.config);
    const locExamples = await siemjManager.buildLocalizationExamplesFromIntegrationTestResult(
      this.params.rule,
      this.params.tmpDirPath
    );
    return locExamples;
  }

  public static readonly USE_OLD_TESTS_RESULT = 'Использовать';
  public static readonly RESTART_TESTS = 'Повторить';
}
