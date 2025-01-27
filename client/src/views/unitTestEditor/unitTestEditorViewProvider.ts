import * as vscode from 'vscode';

import { Configuration } from '../../models/configuration';
import { BaseUnitTest } from '../../models/tests/baseUnitTest';
import { TestHelper } from '../../helpers/testHelper';
import { DialogHelper } from '../../helpers/dialogHelper';
import { ExceptionHelper } from '../../helpers/exceptionHelper';
import { RegExpHelper } from '../../helpers/regExpHelper';
import { Correlation } from '../../models/content/correlation';
import { Normalization } from '../../models/content/normalization';
import { WebViewProviderBase } from '../tableListsEditor/webViewProviderBase';
import webviewHtmlProvider from '../webviewHtmlProvider';
import { RuleBaseItem } from '../../models/content/ruleBaseItem';
import { Enrichment } from '../../models/content/enrichment';
import { Aggregation } from '../../models/content/aggregation';

export class UnitTestContentEditorViewProvider extends WebViewProviderBase {
  public static readonly viewId = 'ModularTestEditorView';
  public static readonly showEditorCommand = 'ModularTestEditorView.showEditor';
  public static readonly onTestSelectionChangeCommand =
    'ModularTestEditorView.onTestSelectionChange';

  private rule: RuleBaseItem;

  public constructor(private readonly config: Configuration) {
    super();
  }

  public static init(config: Configuration): void {
    const context = config.getContext();

    const provider = new UnitTestContentEditorViewProvider(config);

    context.subscriptions.push(
      vscode.commands.registerCommand(
        UnitTestContentEditorViewProvider.showEditorCommand,
        async (rule: Correlation | Enrichment | Normalization | Aggregation) => {
          if (!rule) {
            DialogHelper.showError(config.getMessage('View.UnitTests.RuleIsNotLoaded'));
            return;
          }

          rule.reloadUnitTests();
          return provider.showEditor(rule);
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        UnitTestContentEditorViewProvider.onTestSelectionChangeCommand,
        async (test: BaseUnitTest) => {
          vscode.commands.executeCommand(UnitTestContentEditorViewProvider.showEditorCommand, test);
        }
      )
    );
  }

  public async showEditor(
    rule: Correlation | Enrichment | Normalization | Aggregation
  ): Promise<void> {
    if (
      !(
        rule instanceof Correlation ||
        rule instanceof Enrichment ||
        rule instanceof Normalization ||
        rule instanceof Aggregation
      )
    ) {
      DialogHelper.showWarning(
        `The modular test editor does not support rules other than correlations, normalizations, enrichments, and aggregations`
      );
      return;
    }

    this.rule = rule;

    // Создать и показать панель.
    const viewTitle = this.config.getMessage('View.UnitTests.Title', rule.getName());
    const panel = vscode.window.createWebviewPanel(
      UnitTestContentEditorViewProvider.viewId,
      viewTitle,
      vscode.ViewColumn.One,
      {
        retainContextWhenHidden: true,
        enableFindWidget: true
      }
    );

    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.config.getExtensionUri(), 'client/webview/out/assets'),
        vscode.Uri.joinPath(this.config.getExtensionUri(), 'client/webview/node_modules')
      ]
    };

    panel.webview.onDidReceiveMessage(this.receiveMessageFromWebView, this);
    this.setView(panel);
    await this.updateView();
  }

  private async updateView(): Promise<void> {
    try {
      const getTranslation: (s: string) => string = this.config.getMessage.bind(this.config);

      const translations = {
        EditorTitle: getTranslation('View.UnitTests.EditorTitle'),
        Save: getTranslation('Save'),
        SaveAll: getTranslation('SaveAll'),
        Run: getTranslation('Run'),
        RunAll: getTranslation('RunAll'),
        WordWrap: getTranslation('View.UnitTests.WordWrap'),
        ActualResult: getTranslation('View.UnitTests.ActualResult'),
        ConditionForPassingTheTest: getTranslation('View.UnitTests.ConditionForPassingTheTest'),
        CorrelationRawEvents: getTranslation('View.UnitTests.CorrelationRawEvents'),
        NormalizationRawEvents: getTranslation('View.UnitTests.NormalizationRawEvents'),
        ReplaceExpectedEventWithActual: getTranslation(
          'View.UnitTests.ReplaceExpectedEventWithActual'
        ),
        RunTest: getTranslation('View.UnitTests.RunTest'),
        AddTest: getTranslation('View.UnitTests.AddTest'),
        DeleteTest: getTranslation('View.UnitTests.DeleteTest'),
        TestPassed: getTranslation('View.UnitTests.TestPassed'),
        TestFailed: getTranslation('View.UnitTests.TestFailed')
      };

      const webviewRootUri = this.getView()
        .webview.asWebviewUri(this.config.getExtensionUri())
        .toString();

      const htmlContent = await webviewHtmlProvider.getWebviewHtml(
        'unit-test-editor',
        webviewRootUri,
        translations
      );

      this.setHtmlContent(htmlContent);
    } catch (error) {
      DialogHelper.showError(this.config.getMessage('View.UnitTests.CouldNotOpenTheTest'), error);
    }
  }

  private async receiveMessageFromWebView(message: any) {
    switch (message.command) {
      case 'documentIsReady':
        return this.documentIsReadyHandler();

      case 'UnitTestEditor.saveAllTests':
        return this.saveTests(message.payload.tests);

      case 'UnitTestEditor.runAllTests':
        await this.saveTests(message.payload.tests);
        return this.runAllTests();

      case 'UnitTestEditor.runTest':
        await this.saveTests(message.payload.tests);
        return this.runTest(message.payload.testNumber);

      case 'UnitTestEditor.updateExpectation':
        return this.updateTestExpectation(message.payload.testNumber);
    }
  }

  private async updateTestExpectation(testNumber: number): Promise<void> {
    const test = this.rule.getUnitTestByNumber(testNumber);
    const actualEvent = test.getActualData();

    if (!actualEvent) {
      DialogHelper.showWarning(this.config.getMessage('View.UnitTests.NoActualEvent'));
      return;
    }

    let testResult: string;

    // В модульных тестах корреляций есть expect и возможны комментарии, поэтому надо заменить события, сохранив остальное.
    if (this.rule instanceof Correlation) {
      const newTestCode = `expect 1 ${actualEvent}`;
      const currentTestCode = test.getTestExpectation();
      testResult = currentTestCode.replace(
        RegExpHelper.getExpectSectionRegExp(),
        // Фикс того, что из newTestCode пропадают доллары
        // https://stackoverflow.com/questions/9423722/string-replace-weird-behavior-when-using-dollar-sign-as-replacement
        function () {
          return newTestCode;
        }
      );
    }

    // Для нормализации просто сохраняем фактическое событие без дополнительных преобразований.
    if (this.rule instanceof Normalization) {
      testResult = actualEvent;
    }

    // Обновляем ожидаемое событие на диске и во вьюшке.
    test.setTestExpectation(testResult);

    await test.save();
    await this._updateTestInWebview({ testNumber, expectationData: testResult });

    DialogHelper.showInfo(this.config.getMessage('View.UnitTests.ExpectedEventReplacedWithActual'));
  }

  private async documentIsReadyHandler(): Promise<boolean> {
    const tests = [];
    const unitTests = this.rule.getUnitTests();
    const ruleData = await this.rule.getRuleCode();

    const templateTest = unitTests.length ? unitTests[0] : this.rule.createNewUnitTest();
    const defaultInputData = templateTest.getDefaultInputData();
    const defaultExpectationData = templateTest.getDefaultExpectation();

    for (const unitTest of unitTests) {
      const status = unitTest.getStatus();
      const inputData = unitTest.getTestInputData();
      const expectationData = TestHelper.formatTestCodeAndEvents(unitTest.getTestExpectation());
      const actualData = unitTest.getActualData();

      tests.push({
        status,
        inputData,
        expectationData,
        actualData
      });
    }

    return await this.postMessage({
      command: 'UnitTestEditor.setState',
      payload: {
        ruleType: this.rule instanceof Normalization ? 'normalization' : 'correlation',
        ruleData,
        tests,
        defaultInputData,
        defaultExpectationData
      }
    });
  }

  private async saveTests(testsData: { inputData: string; expectationData: string }[]) {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: false
      },
      async (progress) => {
        progress.report({
          message: this.config.getMessage('View.UnitTests.TestsAreSaving')
        });

        try {
          const tests = this.rule.getUnitTests();

          // Delete extra tests
          this.rule.setUnitTests(tests.slice(0, testsData.length));

          testsData.forEach((testData, index) => {
            const testNumber = index + 1;
            const test = tests[index] ?? this.rule.addNewUnitTest();
            test.setNumber(testNumber);
            test.setTestInputData(testData.inputData);
            test.setTestExpectation(testData.expectationData);
          });

          await this.rule.saveUnitTests();

          DialogHelper.showInfo(this.config.getMessage('View.UnitTests.TestsAreSaved'));
        } catch (error) {
          ExceptionHelper.show(
            error,
            `Failed to save unit tests of the "${this.rule.getName()}" rule`
          );
        }
      }
    );
  }

  private async runTest(testNumber: number);
  private async runTest(unitTest: BaseUnitTest);
  private async runTest(testOrTestNumber: number | BaseUnitTest) {
    let test;
    let testNumber;

    if (testOrTestNumber instanceof BaseUnitTest) {
      test = testOrTestNumber;
      testNumber = test.getNumber();
    } else {
      test = this.rule.getUnitTestByNumber(testOrTestNumber);
      testNumber = testOrTestNumber;
    }

    if (!test) {
      DialogHelper.showError(
        this.config.getMessage(
          'View.UnitTests.NoSuchTestForTheRule',
          testNumber,
          this.rule.getName()
        )
      );
      return;
    }

    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: false
      },
      async (progress) => {
        try {
          progress.report({
            message: this.config.getMessage('View.UnitTests.TestIsRunning', test.getNumber())
          });

          const runner = this.rule.getUnitTestRunner();
          const updatedTest = await runner.run(test);
          const actualData = updatedTest.getActualData();

          this._updateTestInWebview({
            testNumber,
            actualData
          });
        } catch (error) {
          const outputData = test.getOutput();
          this._updateTestInWebview({
            testNumber,
            actualData: outputData
          });

          ExceptionHelper.show(error, 'Unexpected error while executing the modular test');
        } finally {
          this._updateTestInWebview({
            testNumber,
            status: test.getStatus()
          });
        }
      }
    );
  }

  private async runAllTests() {
    const tests = this.rule.getUnitTests();

    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: false
      },
      async (progress) => {
        try {
          progress.report({
            message: this.config.getMessage('View.UnitTests.TestsAreRunning', this.rule.getName())
          });

          await Promise.all(tests.map(this.runTest.bind(this)));
        } catch (error) {
          ExceptionHelper.show(
            error,
            `Error while running modular tests of the rule "${this.rule.getName()}"`
          );
        } finally {
          tests.forEach((unitTest, index) => {
            this._updateTestInWebview({
              testNumber: index + 1,
              status: unitTest.getStatus()
            });
          });
        }
      }
    );
  }

  private async _updateTestInWebview(payload: {
    testNumber: number;
    status?: 'Unknown' | 'Success' | 'Failed';
    inputData?: string;
    actualData?: string;
    expectationData?: string;
  }): Promise<boolean> {
    return this.postMessage({
      command: 'UnitTestEditor.updateTest',
      payload
    });
  }
}
