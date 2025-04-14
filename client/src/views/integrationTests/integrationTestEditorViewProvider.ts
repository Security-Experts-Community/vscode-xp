import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';

import { DialogHelper } from '../../helpers/dialogHelper';
import { MustacheFormatter } from '../mustacheFormatter';
import { EventMimeType, TestHelper } from '../../helpers/testHelper';
import { IntegrationTest } from '../../models/tests/integrationTest';
import { Correlation } from '../../models/content/correlation';
import { Enrichment } from '../../models/content/enrichment';
import { RuleBaseItem } from '../../models/content/ruleBaseItem';
import { Configuration } from '../../models/configuration';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { TestStatus } from '../../models/tests/testStatus';
import { ExceptionHelper } from '../../helpers/exceptionHelper';
import { XpException } from '../../models/xpException';
import { Enveloper } from '../../models/enveloper';
import { ExtensionState } from '../../models/applicationState';
import { Log } from '../../extension';
import { ShowTestResultsDiffCommand } from './command/showTestResultsDiffCommand';
import { RunIntegrationTestsCommand } from './command/runIntegrationTestsCommand';
import { NormalizeRawEventsCommand } from './command/normalizeRawEventsCommand';
import { GetExpectedEventCommand } from './command/getExpectEventCommand';
import { StringHelper } from '../../helpers/stringHelper';
import { SaveAllCommand } from './command/saveAllCommand';
import { Aggregation } from '../../models/content/aggregation';
import { ShowActualEventCommand } from './command/showActualEventCommand';

export class IntegrationTestEditorViewProvider {
  public static readonly viewId = 'IntegrationTestEditorView';
  public static readonly onTestSelectionChangeCommand =
    'IntegrationTestEditorView.onTestSelectionChange';

  private view?: vscode.WebviewPanel;
  private rule: RuleBaseItem;

  public constructor(
    private readonly config: Configuration,
    private readonly templatePath: string
  ) {}

  public static init(config: Configuration): void {
    // Форма создания визуализации интеграционных тестов.
    const templatePath = path.join(
      config.getExtensionPath(),
      path.join('client', 'templates', 'IntegrationTestEditor.html')
    );

    const provider = new IntegrationTestEditorViewProvider(config, templatePath);

    // Открытие формы тестов.
    config.getContext().subscriptions.push(
      vscode.commands.registerCommand(
        IntegrationTestEditorViewProvider.showEditorCommand,
        async (rule: Correlation | Enrichment) => {
          // Обновляем интеграционные тесты для того, чтобы можно было увидеть актуальные тесты при их модификации на ЖД.
          if (!rule) {
            DialogHelper.showError('Правило еще не успело загрузится. Повторите еще раз');
            return;
          }

          // TODO: обновление интеграционных тестов с диска сбрасывает их статус. Можно использовать watcher для этого.
          rule.reloadIntegrationTests();
          return provider.showEditor(rule);
        }
      )
    );

    config.getContext().subscriptions.push(
      vscode.commands.registerCommand(
        IntegrationTestEditorViewProvider.onTestSelectionChangeCommand,
        async (test: IntegrationTest) => {
          vscode.commands.executeCommand(IntegrationTestEditorViewProvider.showEditorCommand);
        }
      )
    );
  }

  public static readonly showEditorCommand = 'IntegrationTestEditorView.showEditor';
  public async showEditor(rule: Correlation | Enrichment | Aggregation): Promise<void> {
    Log.debug(`The integration test editor is open to the ${rule.getName()}`);

    if (this.view) {
      Log.debug(
        `The previously opened integration test editor for the rule ${this.rule.getName()} was automatically closed`
      );

      this.rule = null;
      this.view.dispose();
    }

    if (
      !(rule instanceof Correlation || rule instanceof Enrichment || rule instanceof Aggregation)
    ) {
      DialogHelper.showWarning(
        `The Integration test editor does not support rules other than correlations, enrichments, and aggregations`
      );
      return;
    }

    this.rule = rule;

    // Создать и показать панель.
    const viewTitle = this.config.getMessage('View.IntegrationTests.Title', this.rule.getName());
    this.view = vscode.window.createWebviewPanel(
      IntegrationTestEditorViewProvider.viewId,
      viewTitle,
      vscode.ViewColumn.One,
      {
        retainContextWhenHidden: true,
        enableFindWidget: true,
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(this.config.getExtensionUri(), 'client', 'out')]
      }
    );

    // Создаем временную директорию для результатов тестов, которая посмотреть почему не прошли тесты.
    this.testsTmpFilesPath = this.config.getRandTmpSubDirectoryPath();

    // Запрос на обновление вьюшки если файлы поменялись.
    this.testFilesWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.rule.getDirectoryPath(), '**/*.{tc,json}')
    );

    this.config.getContext().subscriptions.push(this.testFilesWatcher);
    this.testFilesWatcher.onDidChange(this.onExternalTestFilesModification, this);
    this.testFilesWatcher.onDidCreate(this.onExternalTestFilesModification, this);
    this.testFilesWatcher.onDidDelete(this.onExternalTestFilesModification, this);

    this.directoriesFilesWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(
        this.rule.getParentPath(),
        `{${this.rule.getName()},${this.rule.getName()}/tests}`
      )
    );
    this.config.getContext().subscriptions.push(this.directoriesFilesWatcher);
    this.directoriesFilesWatcher.onDidDelete(this.onExternalTestFilesModification, this);

    this.view.webview.options = {
      enableScripts: true
    };

    this.view.webview.onDidReceiveMessage(this.receiveMessageFromWebView, this);

    // Очистка временных файлов после закрытия вьюшки.
    this.view.onDidDispose(async (e: void) => {
      this.view = undefined;
      await FileSystemHelper.recursivelyDeleteDirectory(this.testsTmpFilesPath);
      this.testFilesWatcher.dispose();
      this.directoriesFilesWatcher.dispose();
    }, this);

    await this.updateView();
  }

  private async onExternalTestFilesModification(uri: vscode.Uri): Promise<void> {
    // TODO: не всегда корректно обрабатывает, отключено до решения данной проблемы
    return;

    if (IntegrationTestEditorViewProvider.SAVING_IN_PROGRESS) {
      Log.trace(
        `A file ${uri.fsPath} modification detected when working through the extension modification`
      );
      return;
    }

    Log.trace(
      `A file ${uri.fsPath} modification detected by external programs modification has been detected`
    );

    // Правило удалили
    if (!fs.existsSync(this.rule.getDirectoryPath())) {
      const usersResponse = await DialogHelper.showInfo(
        this.config.getMessage('View.IntegrationTests.Message.RuleWasRemoved', this.rule.getName()),
        this.config.getMessage('Yes'),
        this.config.getMessage('No')
      );
      if (usersResponse === this.config.getMessage('Yes')) {
        this.view.dispose();
        return;
      }
    }

    const usersResponse = await DialogHelper.showInfo(
      this.config.getMessage(
        'View.IntegrationTests.Message.RequestToUpdateWindow',
        this.rule.getName()
      ),
      this.config.getMessage('Yes'),
      this.config.getMessage('No')
    );

    if (!usersResponse || usersResponse === this.config.getMessage('No')) {
      return;
    }

    this.rule.reloadIntegrationTests();
    this.updateView();
  }

  /**
   * Удаляет директорию в с временными файлами интеграционных тестов, который нужны для выявления ошибок в тестах.
   */
  private async updateView(focusTestNumber?: number): Promise<void> {
    // Пользователь уже закрыл вьюшку.
    if (!this.view) {
      return;
    }

    const resultFocusTestNumber = focusTestNumber ?? 1;
    Log.debug(
      `The integration test webview has been uploaded/updated. Current Test #${resultFocusTestNumber ?? '1'}`
    );

    const resourcesUri = this.config.getExtensionUri();
    const extensionBaseUri = this.view.webview.asWebviewUri(resourcesUri);

    const plain = {
      IntegrationTests: [],
      ExtensionBaseUri: extensionBaseUri,
      RuleName: this.rule.getName(),
      ActiveTestNumber: resultFocusTestNumber,

      // Локализация вьюшки
      Locale: {
        Test: this.config.getMessage('View.IntegrationTests.Test'),
        SaveAll: this.config.getMessage('View.IntegrationTests.SaveAll'),
        RunAllTests: this.config.getMessage('View.IntegrationTests.RunAllTests'),
        RawEvents: this.config.getMessage('View.IntegrationTests.RawEvents'),
        WordWrap: this.config.getMessage('View.IntegrationTests.WordWrap'),
        WrapRawEvents: this.config.getMessage('View.IntegrationTests.WrapRawEventsInAnEnvelope'),
        Normalize: this.config.getMessage('View.IntegrationTests.Normalize'),
        NormalizeAndEnrich: this.config.getMessage('View.IntegrationTests.NormalizeAndEnrich'),
        NormalizedEvents: this.config.getMessage('View.IntegrationTests.NormalizedEvents'),
        TestCondition: this.config.getMessage('View.IntegrationTests.ConditionForPassingTheTest'),
        ShowActualEvent: this.config.getMessage('View.IntegrationTests.ShowActualEvent'),
        GetExpectedEvent: this.config.getMessage('View.IntegrationTests.GetExpectedEvent'),
        CompareResults: this.config.getMessage('View.IntegrationTests.CompareYourResults'),
        ClearExpectedEvent: this.config.getMessage('View.IntegrationTests.ClearExpectedEvent')
      }
    };

    try {
      const integrationTest = this.rule.getIntegrationTests();

      // Если тестов нет, то создаем пустую форму для первого теста
      if (integrationTest.length === 0) {
        plain['IntegrationTests'].push({
          TestNumber: 1,
          RawEvents: '',
          NormEvents: '',
          TestCode: `expect 1 {"correlation_name" : "${this.rule.getName()}"}`,
          TestOutput: '',
          JsonedTestObject: '',
          TestStatus: ''
        });
      } else {
        for (const it of integrationTest) {
          const jsonedTestObject = JSON.stringify(it);

          const rawEvents = it.getRawEvents();
          const formattedTestCode = TestHelper.formatTestCodeAndEvents(it.getTestCode());
          const formattedNormalizedEvents = TestHelper.formatTestCodeAndEvents(
            it.getNormalizedEvents()
          );

          plain['IntegrationTests'].push({
            TestNumber: it.getNumber(),
            RawEvents: rawEvents,
            NormEvents: formattedNormalizedEvents,
            TestCode: formattedTestCode,
            TestOutput: it.getOutput(),
            JsonedTestObject: jsonedTestObject,
            TestStatus: this.testStatusToUiStyle(it),
            IsFailed: it.getStatus() === TestStatus.Failed,
            CanGetExpectedEvent: this.canGetExpectedEvent(it)
          });
        }
      }

      const template = await FileSystemHelper.readContentFile(this.templatePath);
      const formatter = new MustacheFormatter(template);
      const htmlContent = formatter.format(plain);
      this.view.webview.html = htmlContent;
    } catch (error) {
      DialogHelper.showError(
        this.config.getMessage('View.IntegrationTests.Message.FailedToOpenTests'),
        error
      );
    }
  }

  /**
   * Функция возвращает значение, показывающее возможность получить ожидаемое событие
   * @param it интеграционный тест
   * @returns возможно ли для данного теста получить ожидаемое событие
   */
  private canGetExpectedEvent(it: IntegrationTest): boolean {
    if (TestHelper.isNegativeTest(it.getTestCode())) {
      return false;
    }

    if (it.getStatus() === TestStatus.Success || it.getStatus() === TestStatus.Failed) {
      return true;
    }

    if (it.getNormalizedEvents()) {
      return true;
    }
  }

  private testStatusToUiStyle(it: IntegrationTest): string {
    const testStatus = it.getStatus();
    switch (testStatus) {
      case TestStatus.Unknown: {
        return '';
      }
      case TestStatus.Success: {
        return 'success';
      }
      case TestStatus.Failed: {
        return 'failure';
      }
    }
  }

  private async receiveMessageFromWebView(message: any) {
    if (ExtensionState.get().isExecutedState()) {
      DialogHelper.showWarning(Configuration.get().getMessage('WaitForCommandToFinishExecuting'));
      return true;
    }

    try {
      ExtensionState.get().startExecutionState();
      await this.executeCommand(message);
    } catch (error) {
      ExceptionHelper.show(error, `Ошибка выполнения команды '${message.command}'`);
      return true;
    } finally {
      ExtensionState.get().stopExecutionState();
    }
  }

  private async executeCommand(message: any) {
    // События, не требующие запуска утилит.
    switch (message.command) {
      case 'saveAllTests': {
        try {
          IntegrationTestEditorViewProvider.SAVING_IN_PROGRESS = true;
          this.rule = await this.saveAllTests(message);
          Log.info(`All tests of the rule are ${this.rule.getName()} saved`);
        } catch (error) {
          ExceptionHelper.show(
            error,
            this.config.getMessage('View.IntegrationTests.Message.FailedToSaveTests')
          );
          return true;
        } finally {
          IntegrationTestEditorViewProvider.SAVING_IN_PROGRESS = false;
        }

        break;
      }

      case 'addEnvelope': {
        let rawEvents = message?.rawEvents as string;
        rawEvents = StringHelper.replaceIrregularSymbols(rawEvents);
        const mimeType = message?.mimeType as EventMimeType;

        return vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            cancellable: false,
            title: this.config.getMessage('View.IntegrationTests.Progress.AddingEnvelope')
          },
          async (progress) => {
            try {
              return this.addEnvelope(rawEvents, mimeType);
            } catch (error) {
              ExceptionHelper.show(
                error,
                this.config.getMessage('View.IntegrationTests.Message.DefaultErrorAddingEnvelope')
              );
            }
          }
        );
      }

      case 'lastTest': {
        this.lastTest();
        return;
      }

      // Команды с запуском утилит.
      case 'NormalizeRawEventsCommand': {
        try {
          IntegrationTestEditorViewProvider.SAVING_IN_PROGRESS = true;
          if (typeof message?.isEnrichmentRequired !== 'boolean') {
            DialogHelper.showInfo('The event enrichment parameter is not set');
            return true;
          }
          const isEnrichmentRequired = message?.isEnrichmentRequired as boolean;

          // Актуализируем сырые события в тесте из вьюшки.
          const currTest = await this.saveTestFromUI(message);
          const command = new NormalizeRawEventsCommand({
            config: this.config,
            isEnrichmentRequired: isEnrichmentRequired,
            rule: this.rule,
            test: currTest
          });

          await command.execute();
          this.updateView(currTest.getNumber());
          return true;
        } catch (error) {
          ExceptionHelper.show(
            error,
            this.config.getMessage('View.IntegrationTests.Message.DefaultErrorEventsNormalization')
          );
        } finally {
          IntegrationTestEditorViewProvider.SAVING_IN_PROGRESS = false;
        }
        break;
      }

      case 'ShowTestResultsDiffCommand': {
        if (!message?.selectedTestNumber) {
          Log.error('The test number was not passed in the backend request');
          DialogHelper.showError(this.config.getMessage('UncaughtExceptionMessage'));
          return;
        }

        try {
          const selectedTestNumber = parseInt(message?.selectedTestNumber);
          if (!selectedTestNumber) {
            throw new XpException(
              `Переданное значение ${message?.activeTestNumber} не является номером интеграционного теста`
            );
          }

          const currTest = await this.saveTestFromUI(message);

          const command = new ShowTestResultsDiffCommand({
            config: this.config,
            rule: this.rule,
            test: currTest,
            tmpDirPath: this.testsTmpFilesPath,
            testNumber: selectedTestNumber
          });
          await command.execute();
        } catch (error) {
          ExceptionHelper.show(error, 'Ошибка сравнения фактического и ожидаемого события');
        }
        break;
      }

      case 'GetExpectedEventCommand': {
        if (!message?.selectedTestNumber) {
          Log.error('The test number was not passed in the backend request');
          DialogHelper.showError(this.config.getMessage('UncaughtExceptionMessage'));
          return;
        }

        try {
          IntegrationTestEditorViewProvider.SAVING_IN_PROGRESS = true;
          const selectedTestNumber = parseInt(message?.selectedTestNumber);
          if (!selectedTestNumber) {
            throw new XpException(
              `Переданное значение ${message?.activeTestNumber} не является номером интеграционного теста`
            );
          }

          const currTest = await this.saveTestFromUI(message);
          const command = new GetExpectedEventCommand({
            config: this.config,
            rule: this.rule,
            test: currTest,
            testNumber: selectedTestNumber,
            tmpDirPath: this.testsTmpFilesPath
          });

          await command.execute(this, selectedTestNumber);
          return true;
        } catch (error) {
          ExceptionHelper.show(error, 'Ошибка обновления ожидаемого события');
        } finally {
          IntegrationTestEditorViewProvider.SAVING_IN_PROGRESS = false;
        }
        break;
      }

      case 'ShowActualEventCommand': {
        if (!message?.selectedTestNumber) {
          Log.error('The test number was not passed in the backend request');
          DialogHelper.showError(this.config.getMessage('UncaughtExceptionMessage'));
          return;
        }

        try {
          IntegrationTestEditorViewProvider.SAVING_IN_PROGRESS = true;
          const selectedTestNumber = parseInt(message?.selectedTestNumber);
          if (!selectedTestNumber) {
            throw new XpException(
              `Переданное значение ${message?.activeTestNumber} не является номером интеграционного теста`
            );
          }

          const currTest = await this.saveTestFromUI(message);
          const command = new ShowActualEventCommand({
            config: this.config,
            rule: this.rule,
            test: currTest,
            testNumber: selectedTestNumber,
            tmpDirPath: this.testsTmpFilesPath
          });

          await command.execute();
          return true;
        } catch (error) {
          ExceptionHelper.show(error, 'Ошибка обновления ожидаемого события');
        } finally {
          IntegrationTestEditorViewProvider.SAVING_IN_PROGRESS = false;
        }
        break;
      }

      case 'RunIntegrationTestsCommand': {
        // Сохраняем актуальное состояние тестов из вьюшки.
        let rule: RuleBaseItem;
        try {
          IntegrationTestEditorViewProvider.SAVING_IN_PROGRESS = true;
          rule = await this.saveAllTests(message);
          Log.info(`All tests of the rule are ${this.rule.getName()} saved`);
        } catch (error) {
          ExceptionHelper.show(
            error,
            this.config.getMessage('View.IntegrationTests.Message.FailedToSaveTests')
          );
          return true;
        } finally {
          IntegrationTestEditorViewProvider.SAVING_IN_PROGRESS = false;
        }

        try {
          IntegrationTestEditorViewProvider.SAVING_IN_PROGRESS = true;
          await FileSystemHelper.recursivelyDeleteDirectory(this.testsTmpFilesPath);

          const command = new RunIntegrationTestsCommand({
            config: this.config,
            rule: rule,
            tmpDirPath: this.testsTmpFilesPath
          });

          const shouldUpdateViewAfterTestsRunned = await command.execute();
          // Обновляем только в том случае, если есть что нового показать пользователю.
          if (shouldUpdateViewAfterTestsRunned) {
            await this.updateView(this.getSelectedTestNumber(message));
          }
        } catch (error) {
          ExceptionHelper.show(
            error,
            this.config.getMessage('View.IntegrationTests.Message.FailedToExecutionTests')
          );
        } finally {
          IntegrationTestEditorViewProvider.SAVING_IN_PROGRESS = false;
        }

        return true;
      }
      default: {
        DialogHelper.showError(`Команда ${message?.command} не найдена`);
      }
    }
  }

  private async saveAllTests(message: any): Promise<RuleBaseItem> {
    if (!message?.activeTestNumber) {
      Log.error('The test number was not passed in the backend request');
      DialogHelper.showError(this.config.getMessage('UncaughtExceptionMessage'));
      return;
    }

    const activeTestNumber = parseInt(message?.activeTestNumber);
    if (!activeTestNumber) {
      throw new XpException(
        `Переданное значение ${message?.activeTestNumber} не является номером интеграционного теста`
      );
    }

    const command = new SaveAllCommand({
      config: this.config,
      rule: this.rule,
      tmpDirPath: this.testsTmpFilesPath,
      testNumber: activeTestNumber,
      tests: message.tests
    });

    const result = await command.execute();
    // Если сохранение прошло успешно, тогда обновляем окно.
    if (result) {
      this.updateView(activeTestNumber);
    }
    return this.rule;
  }

  private lastTest() {
    DialogHelper.showWarning(
      this.config.getMessage('View.IntegrationTests.Message.LastTestCannotBeDeleted')
    );
  }

  private async saveTestFromUI(message: any): Promise<IntegrationTest> {
    let rawEvents = message?.rawEvents;
    if (!rawEvents) {
      throw new XpException(
        this.config.getMessage('View.IntegrationTests.Message.RawEventsAreNotDefined')
      );
    }

    const test = message?.test;
    if (!test) {
      throw new XpException(
        this.config.getMessage('View.IntegrationTests.Message.SaveTheTestBefore')
      );
    }

    const currTest = IntegrationTest.convertFromObject(test);
    rawEvents = TestHelper.compressJsonRawEvents(rawEvents);
    currTest.setRawEvents(rawEvents);
    await currTest.save();
    return currTest;
  }

  private getSelectedTestNumber(message: any): number {
    const activeTestNumberString = message?.activeTestNumber;
    if (!activeTestNumberString) {
      DialogHelper.showError(`The number of the active test is not set`);
      return;
    }

    const activeTestNumber = parseInt(activeTestNumberString);
    return activeTestNumber;
  }

  public async addEnvelope(rawEvents: string, mimeType: EventMimeType): Promise<void> {
    let envelopedRawEventsString: string;
    try {
      const enveloper = new Enveloper(this.config);
      const envelopedEvents = enveloper.addEnvelope(rawEvents, mimeType);
      envelopedRawEventsString = envelopedEvents.join(
        IntegrationTestEditorViewProvider.TEXTAREA_END_OF_LINE
      );
    } catch (error) {
      ExceptionHelper.show(
        error,
        this.config.getMessage('View.IntegrationTests.Message.DefaultErrorAddingEnvelope')
      );
      return;
    }

    await this.updateCurrentTestRawEvent(envelopedRawEventsString);
  }

  public async updateTestCode(newTestCode: string, testNumber?: number): Promise<boolean> {
    return this.view.webview.postMessage({
      command: 'updateTestCode',
      newTestCode: newTestCode,
      testNumber: testNumber
    });
  }

  public async updateCurrentTestRawEvent(rawEvents: string): Promise<boolean> {
    return this.view.webview.postMessage({
      command: 'updateRawEvents',
      rawEvents: rawEvents
    });
  }

  private testFilesWatcher: vscode.FileSystemWatcher;
  private directoriesFilesWatcher: vscode.FileSystemWatcher;

  private testsTmpFilesPath: string;

  public static SAVING_IN_PROGRESS = false;
  public static TEXTAREA_END_OF_LINE = '\n';
}
