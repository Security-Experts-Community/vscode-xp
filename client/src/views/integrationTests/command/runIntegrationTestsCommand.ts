import * as vscode from 'vscode';
import * as fs from 'fs';

import { Command, RuleCommandParams } from '../../../models/command/command';
import { TestHelper } from '../../../helpers/testHelper';
import { DialogHelper } from '../../../helpers/dialogHelper';
import { RunIntegrationTestDialog } from '../../runIntegrationDialog';
import { SiemJOutputParser } from '../../../models/siemj/siemJOutputParser';
import { IntegrationTestRunner } from '../../../models/tests/integrationTestRunner';
import { TestStatus } from '../../../models/tests/testStatus';
import { ContentItemStatus } from '../../../models/content/ruleBaseItem';
import { Log } from '../../../extension';
import { ContentTreeProvider } from '../../contentTree/contentTreeProvider';
import { FileSystemHelper } from '../../../helpers/fileSystemHelper';
import { RegExpHelper } from '../../../helpers/regExpHelper';
import { VsCodeApiHelper } from '../../../helpers/vsCodeApiHelper';

export class RunIntegrationTestsCommand extends Command {
  constructor(private params: RuleCommandParams) {
    super();
  }

  public async execute(): Promise<boolean> {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: true
      },
      async (progress, cancellationToken: vscode.CancellationToken) => {
        // Сбрасываем статус правила
        this.params.rule.setStatus(ContentItemStatus.Default);
        await ContentTreeProvider.refresh(this.params.rule);

        const tests = this.params.rule.getIntegrationTests();
        const ruleName = this.params.rule.getName();
        const config = this.params.config;
        if (tests.length == 0) {
          DialogHelper.showInfo(
            config.getMessage('View.IntegrationTests.Message.NoTestsFound', ruleName)
          );
          return false;
        }

        // Уточняем информацию для пользователей если в правиле обнаружено использование сабрулей.
        const ruleCode = await this.params.rule.getRuleCode();
        if (TestHelper.isRuleCodeContainsSubrules(ruleCode)) {
          const progressMessage = config.getMessage(
            'View.IntegrationTests.Progress.RunAllTestsWithSubrules',
            ruleName
          );
          Log.info(progressMessage);
          progress.report({ message: progressMessage });
        } else {
          const progressMessage = config.getMessage(
            'View.IntegrationTests.Progress.RunAllTests',
            ruleName
          );
          Log.info(progressMessage);
          progress.report({ message: progressMessage });
        }

        const ritd = new RunIntegrationTestDialog(config, {
          tmpFilesPath: this.params.tmpDirPath,
          cancellationToken: cancellationToken
        });
        const testRunnerOptions = await ritd.getIntegrationTestRunOptionsForSingleRule(
          this.params.rule
        );
        testRunnerOptions.cancellationToken = cancellationToken;

        const outputParser = new SiemJOutputParser(config);
        const testRunner = new IntegrationTestRunner(config, outputParser);

        const siemjResult = await testRunner.runOnce(this.params.rule, testRunnerOptions);
        config.resetDiagnostics(siemjResult.fileDiagnostics);

        // Проверка необходимого набора полей.
        this.validateRequiredFields(siemjResult.testCount);

        const executedIntegrationTests = this.params.rule.getIntegrationTests();
        if (executedIntegrationTests.every((it) => it.getStatus() === TestStatus.Success)) {
          // Задаем и обновляем статус элемента дерева
          this.params.rule.setStatus(
            ContentItemStatus.Verified,
            config.getMessage('View.ObjectTree.ItemStatus.TestsPassed')
          );

          DialogHelper.showInfo(
            config.getMessage('View.IntegrationTests.Message.TestsPassed', ruleName)
          );
          await ContentTreeProvider.refresh(this.params.rule);
          return true;
        }

        if (executedIntegrationTests.some((it) => it.getStatus() === TestStatus.Success)) {
          this.params.rule.setStatus(
            ContentItemStatus.Unverified,
            config.getMessage('View.ObjectTree.ItemStatus.TestsFailed')
          );

          DialogHelper.showWarning(
            config.getMessage('View.IntegrationTests.Message.NotAllTestsWereSuccessful', ruleName)
          );
          await ContentTreeProvider.refresh(this.params.rule);
          return true;
        }

        this.params.rule.setStatus(ContentItemStatus.Default);
        DialogHelper.showError(
          config.getMessage('View.IntegrationTests.Message.AllTestsFailed', ruleName)
        );
        ContentTreeProvider.refresh(this.params.rule);
        return true;
      }
    );
  }

  private async validateRequiredFields(testCount: number): Promise<void> {
    [...Array(testCount).keys()]
      .map((i) => i + 1)
      .forEach(async (testNumber) => {
        const corrFilePath = TestHelper.getEnrichedCorrEventFilePath(
          this.params.tmpDirPath,
          this.params.rule.getName(),
          testNumber
        );

        if (!corrFilePath) {
          return;
        }

        if (!fs.existsSync(corrFilePath)) {
          return;
        }

        const corrEvents = await FileSystemHelper.readContentFile(corrFilePath);
        const eventStrings = RegExpHelper.parseJsonsFromMultilineString(corrEvents);
        const ruleFilePath = this.params.rule.getRuleFilePath();

        for (const eventString of eventStrings) {
          const eventObject = JSON.parse(eventString);

          // Проверяем наличие минимального набора полей
          for (const requiredCorrField of this.REQUIRED_CORRELATION_FIELDS) {
            if (eventObject[requiredCorrField]) {
              continue;
            }

            this.params.config.addDiagnosticCollection(
              ruleFilePath,
              // TODO: указывать в какое-то более разумное место.
              VsCodeApiHelper.createDiagnostic(
                0,
                0,
                0,
                0,
                this.params.config.getMessage(
                  `View.IntegrationTests.Message.NotEnoughRequiredFields`,
                  testNumber,
                  requiredCorrField
                )
              )
            );
          }
        }
        //
      });
  }

  private REQUIRED_CORRELATION_FIELDS = [
    'correlation_type',
    'importance',
    'action',
    'status',
    'object'
  ];
}
