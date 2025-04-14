import * as vscode from 'vscode';

import { DialogHelper } from '../../../helpers/dialogHelper';
import { Command, RuleCommandParams } from '../../../models/command/command';
import { SiemjManager } from '../../../models/siemj/siemjManager';
import { IntegrationTest } from '../../../models/tests/integrationTest';
import { ExceptionHelper } from '../../../helpers/exceptionHelper';

export interface NormalizeRawEventsParams extends RuleCommandParams {
  isEnrichmentRequired: boolean;
  test: IntegrationTest;
}

export class NormalizeRawEventsCommand extends Command {
  constructor(private params: NormalizeRawEventsParams) {
    super();
  }

  public async execute(): Promise<boolean> {
    const rawEventsFilePath = this.params.test.getRawEventsFilePath();

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: true
      },
      async (progress, cancellationToken: vscode.CancellationToken) => {
        try {
          const siemjManager = new SiemjManager(this.params.config, cancellationToken);
          let normEvents: string;
          if (this.params.isEnrichmentRequired) {
            const progressMessage = this.params.config.getMessage(
              'View.IntegrationTests.Progress.NormalizationAndEnrichment',
              this.params.test.getNumber()
            );
            progress.report({ message: progressMessage });

            normEvents = await siemjManager.normalizeAndEnrich(this.params.rule, rawEventsFilePath);
          } else {
            const progressMessage = this.params.config.getMessage(
              'View.IntegrationTests.Progress.Normalization',
              this.params.test.getNumber()
            );
            progress.report({ message: progressMessage });

            normEvents = await siemjManager.normalize(this.params.rule, rawEventsFilePath);
          }

          this.params.test.setNormalizedEvents(normEvents);
        } catch (error) {
          ExceptionHelper.show(
            error,
            this.params.config.getMessage(
              'View.IntegrationTests.Message.DefaultErrorEventsNormalization'
            )
          );
          return;
        }

        // Обновление теста.
        const tests = this.params.rule.getIntegrationTests();
        const ruleTestIndex = tests.findIndex(
          (it) => it.getNumber() == this.params.test.getNumber()
        );
        if (ruleTestIndex == -1) {
          DialogHelper.showError('Не удалось обновить интеграционный тест');
          return;
        }

        // Выводим статус.
        let statusMessage: string;
        if (this.params.isEnrichmentRequired) {
          statusMessage = this.params.config.getMessage(
            'View.IntegrationTests.Message.SuccessfulNormalizationAndEnrichment',
            this.params.test.getNumber()
          );
        } else {
          statusMessage = this.params.config.getMessage(
            'View.IntegrationTests.Message.SuccessfulNormalization',
            this.params.test.getNumber()
          );
        }

        progress.report({ message: statusMessage });
        DialogHelper.showInfo(statusMessage);

        // Обновляем правило.
        tests[ruleTestIndex] = this.params.test;
      }
    );

    return Promise.resolve(true);
  }
}
