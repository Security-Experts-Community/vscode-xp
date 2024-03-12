import * as fs from "fs";
import * as vscode from "vscode";
import * as path from "path";

import { Configuration } from "../../models/configuration";
import { BaseUnitTest } from "../../models/tests/baseUnitTest";
import { TestHelper } from "../../helpers/testHelper";
import { TestStatus } from "../../models/tests/testStatus";
import { FileSystemHelper } from "../../helpers/fileSystemHelper";
import { MustacheFormatter } from "../mustacheFormatter";
import { DialogHelper } from "../../helpers/dialogHelper";
import { ExceptionHelper } from "../../helpers/exceptionHelper";
import { UnitTestsListViewProvider } from "./unitTestsListViewProvider";
import { XpException } from "../../models/xpException";
import { RegExpHelper } from "../../helpers/regExpHelper";
import { Correlation } from "../../models/content/correlation";
import { Normalization } from "../../models/content/normalization";
import { WebViewProviderBase } from "../tableListsEditor/webViewProviderBase";

export class UnitTestContentEditorViewProvider extends WebViewProviderBase {
  public static readonly viewId = "ModularTestContentEditorView";

  public static readonly showEditorCommand =
    "ModularTestContentEditorView.showEditor";
  public static readonly onTestSelectionChangeCommand =
    "ModularTestContentEditorView.onTestSelectionChange";

  private _test: BaseUnitTest;

  public constructor(
    private readonly _config: Configuration,
    private readonly _templatePath: string
  ) {
    super();
  }

  public static init(config: Configuration): void {
    const context = config.getContext();

    // Форма создания визуализации интеграционных тестов.
    const templatePath = path.join(
      config.getExtensionPath(),
      path.join("client", "templates", "UnitTestEditor", "UnitTestEditor.html")
    );

    const provider = new UnitTestContentEditorViewProvider(
      config,
      templatePath
    );

    // Открытие кода теста по нажатию на его номер.
    context.subscriptions.push(
      vscode.commands.registerCommand(
        UnitTestContentEditorViewProvider.showEditorCommand,
        async (test: BaseUnitTest) => {
          const testPath = test.getTestExpectationPath();
          if (!fs.existsSync(testPath)) {
            vscode.window.showWarningMessage(
              `Не удалось открыть тест: '${testPath}'`
            );
            return;
          }
          // test.show();
          provider.showEditor(test);
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        UnitTestContentEditorViewProvider.onTestSelectionChangeCommand,
        async (test: BaseUnitTest) => {
          // Открываем код теста.
          vscode.commands.executeCommand(
            UnitTestContentEditorViewProvider.showEditorCommand,
            test
          );
        }
      )
    );
  }

  public async showEditor(unitTest: BaseUnitTest): Promise<void> {
    if (this.getView()) {
      this._test = null;
      this.getView().dispose();
    }

    if (!(unitTest instanceof BaseUnitTest)) {
      return;
    }

    this._test = unitTest;
    const rule = this._test.getRule();

    // Создать и показать панель.
    const viewTitle = `Тест №${this._test.getNumber()} правила '${rule.getName()}'`;
    const panel = vscode.window.createWebviewPanel(
      UnitTestContentEditorViewProvider.viewId,
      viewTitle,
      vscode.ViewColumn.One,
      {
        retainContextWhenHidden: true,
        enableFindWidget: true,
      }
    );

    panel.webview.options = {
      enableScripts: true,
    };

    panel.webview.onDidReceiveMessage(this.receiveMessageFromWebView, this);

    this.setView(panel);

    await this.updateView();
  }

  private async updateView(): Promise<void> {
    const rule = this._test.getRule();

    const resourcesUri = this._config.getExtensionUri();
    const extensionBaseUri = this.getView().webview.asWebviewUri(resourcesUri);

    const plain = {
      UnitTest: null,
      ExtensionBaseUri: extensionBaseUri,
      RuleName: rule.getName(),
    };

    try {
      const formattedTestInput = TestHelper.formatTestCodeAndEvents(
        this._test.getTestInputData()
      );
      const formattedTestExpectation = TestHelper.formatTestCodeAndEvents(
        this._test.getTestExpectation()
      );

      let testStatusStyle: string;
      const testStatus = this._test.getStatus();
      vscode.commands.executeCommand(UnitTestsListViewProvider.refreshCommand);
      switch (testStatus) {
        case TestStatus.Unknown: {
          testStatusStyle = "";
          break;
        }
        case TestStatus.Success: {
          testStatusStyle = "success";
          break;
        }
        case TestStatus.Failed: {
          testStatusStyle = "failure";
          break;
        }
      }

      plain["UnitTest"] = {
        TestNumber: this._test.getNumber(),
        TestInput: formattedTestInput,
        TestExpectation: formattedTestExpectation,
        TestOutput: this._test.getOutput(),
        TestStatus: testStatusStyle,
      };

      const template = await FileSystemHelper.readContentFile(
        this._templatePath
      );
      const formatter = new MustacheFormatter(template);
      const htmlContent = formatter.format(plain);
      this.setHtmlContent(htmlContent);
    } catch (error) {
      DialogHelper.showError("Не удалось открыть модульный тест", error);
    }
  }

  private async receiveMessageFromWebView(message: any) {
    switch (message.command) {
      case "documentIsReady": {
        return this.documentIsReadyHandler();
      }
      case "saveTest": {
        await this.saveTest(message);
        await this.updateInputDataInView(this._test.getTestInputData());

        const expectationData = TestHelper.formatTestCodeAndEvents(
          this._test.getTestExpectation()
        );
        await this.updateExpectationInView(expectationData);

        return;
      }

      case "runTest": {
        await this.runUnitTestHandler(message);
        return;
      }

      case "updateExpectation": {
        await this.updateExpectationHandler();
        return;
      }

      default: {
        DialogHelper.showError("Переданная команда не поддерживается");
      }
    }
  }

  private async updateExpectationHandler(): Promise<void> {
    const actualEvent = this._test.getActualData();
    if (!actualEvent) {
      DialogHelper.showWarning(
        "Фактическое событие не получено. Запустите тест для получения фактического события, после чего можно заменить ожидаемое событие фактическим"
      );
      return;
    }

    const rule = this._test.getRule();
    let testResult: string;

    // В модульных тестах корреляций есть expect и возможны комментарии, поэтому надо заменить события, сохранив остальное.
    if (rule instanceof Correlation) {
      const newTestCode = `expect 1 ${actualEvent}`;
      const currentTestCode = this._test.getTestExpectation();
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
    if (rule instanceof Normalization) {
      testResult = actualEvent;
    }

    // Обновляем ожидаемое событие на диске и во вьюшке.
    this._test.setTestExpectation(testResult);
    await this._test.save();

    this.updateExpectationInView(testResult);
    DialogHelper.showInfo(
      "Ожидаемое событие обновлено. Запустите еще раз тест, он должен пройти"
    );
  }

  private async documentIsReadyHandler(): Promise<boolean> {
    const inputEvents = this._test.getTestInputData();

    const expectationData = TestHelper.formatTestCodeAndEvents(
      this._test.getTestExpectation()
    );

    let inputType = undefined;
    let expectationLanguage = undefined;
    const rule = this._test.getRule();
    // Для корреляций на вход всегда json (нормализованное событие)
    // Код теста это xp-test-code (json, expect, default и т.д.)
    if (rule instanceof Correlation) {
      inputType = "json";
      expectationLanguage = "xp-test-code";
    }

    // TODO: Для законченной нормализации в теории можно распарсить код правила и понять какой тип данных в raw_N.txt
    // Ожидаемое событие всегда json
    if (rule instanceof Normalization) {
      const ruleCode = await rule.getRuleCode();
      if (ruleCode.match(/^JSON\s*=\s*/)) {
        inputType = "json";
      }

      expectationLanguage = "json";
    }

    // Контракт на команду к FE
    // {
    // command = 'setIUnitTestEditorViewContent',
    // inputEvents : {language: json, data: string},
    // expectation: {language: json|xp-test-code, data: string},
    // }
    await this.postMessage({
      command: "setIUnitTestEditorViewContent",
      inputEvents: { language: inputType, data: inputEvents },
      expectation: { language: expectationLanguage, data: expectationData },
    });

    // Если в тесте сохранены фактические данные, например, после запуска тестов по списку.
    const actualData = this._test.getActualData();
    if(actualData) {
      return this.updateActualDataInView(actualData);
    }
  }

  private async saveTest(message: any) {
    try {
      const inputData = message?.inputData;
      if (!inputData) {
        throw new XpException(
          `Не задано сырое событие для теста №${this._test.getNumber()}. Добавьте его и повторите`
        );
      }
      this._test.setTestInputData(inputData);

      const expectation = message?.expectation;
      if (!expectation) {
        throw new XpException(
          `Не задано ожидаемое нормализованное событие для теста №${this._test.getNumber()}. Добавьте его и повторите`
        );
      }

      this._test.setTestExpectation(expectation);
      await this._test.save();

      DialogHelper.showInfo("Тест успешно сохранён");
    } catch (error) {
      ExceptionHelper.show(
        error,
        `Не удалось сохранить модульный тест №${
          this._test.label
        } правила ${this._test.getRule().getName()}`
      );
    }
  }

  private async runUnitTestHandler(message: any) {
    if (!message?.inputData) {
      DialogHelper.showError(
        "Не заданы входные данные теста. Задайте их и повторите"
      );
      return;
    }

    if (!message?.expectation) {
      DialogHelper.showError(
        "Не задано условие проверки теста или ожидаемое событие. Задайте его и повторите"
      );
      return;
    }

    // Обновляем тест и сохраняем
    const expectation = message.expectation;
    this._test.setTestExpectation(expectation);

    const inputData = message?.inputData;
    this._test.setTestInputData(inputData);
    await this._test.save();

    const rule = this._test.getRule();
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
      },
      async (progress) => {
        try {
          progress.report({
            message: `Выполнение теста №${this._test.getNumber()}`,
          });
          const runner = rule.getUnitTestRunner();
          this._test = await runner.run(this._test);

          const actualData = this._test.getActualData();
          this.updateActualDataInView(actualData);

        } catch (error) {
          const outputData = this._test.getOutput();
          this.updateActualDataInView(outputData);
          ExceptionHelper.show(
            error,
            "Неожиданная ошибка выполнения модульного теста"
          );
        } finally {
          vscode.commands.executeCommand(UnitTestsListViewProvider.refreshCommand);
        }        
      }
    );
  }

  private async updateExpectationInView(expectation: string): Promise<boolean> {
    return this.postMessage({
      command: "updateExpectation",
      expectation: expectation,
    });
  }

  private async updateInputDataInView(inputData: string): Promise<boolean> {
    return this.postMessage({
      command: "updateInputData",
      inputData: inputData,
    });
  }

  private async updateActualDataInView(actualData: string): Promise<boolean> {
    return this.postMessage({
      command: "updateActualData",
      actualData: actualData,
    });
  }
}
