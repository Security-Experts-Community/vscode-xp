import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { SiemjConfigHelper } from '../../../models/siemj/siemjConfigHelper';
import { SiemJOutputParser } from '../../../models/siemj/siemJOutputParser';
import { Configuration } from '../../../models/configuration';
import { SiemjConfBuilder } from '../../../models/siemj/siemjConfigBuilder';
import { XpException } from '../../../models/xpException';
import { DialogHelper } from '../../../helpers/dialogHelper';
import { Log } from '../../../extension';
import { SiemjManager } from '../../../models/siemj/siemjManager';
import { ViewCommand } from '../../../models/command/command';

/**
 * Команда выполняющая сборку формул нормализации
 */
export class BuildNormalizationsCommand extends ViewCommand {
  constructor(
    private config: Configuration,
    private outputParser: SiemJOutputParser
  ) {
    super();
  }

  public async execute(): Promise<void> {
    Log.info(this.config.getMessage('View.ObjectTree.Progress.BuildAllNormalizations'));

    if (!this.config.isKbOpened()) {
      DialogHelper.showWarning(
        this.config.getMessage('View.ObjectTree.Message.NeedToOpenKnowledgeBase')
      );
      return;
    }

    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
        title: this.config.getMessage('View.ObjectTree.Progress.BuildAllNormalizations')
      },
      async (progress, cancellationToken: vscode.CancellationToken) => {
        await SiemjConfigHelper.clearArtifacts(this.config);

        // Если в правиле используются сабрули, тогда собираем весь граф корреляций.
        const siemjConfContents = this.getParamsForAllRoots(this.config);

        this.config.getDiagnosticCollection().clear();

        for (const siemjConfContentEntity of siemjConfContents) {
          const rootFolder = siemjConfContentEntity['packagesRoot'];
          const siemjConfContent = siemjConfContentEntity['configContent'];
          try {
            if (!siemjConfContent) {
              throw new XpException(this.config.getMessage('CouldNotGenerateSiemjConf'));
            }

            const siemjManager = new SiemjManager(this.config, cancellationToken);
            const contentRootPath = path.join(this.config.getKbFullPath(), rootFolder);
            const siemjExecutionResult = await siemjManager.executeSiemjConfig(
              contentRootPath,
              siemjConfContent
            );
            const result = await this.outputParser.parse(siemjExecutionResult.output);

            // Выводим ошибки и замечания для тестируемого правила.
            for (const rfd of result.fileDiagnostics) {
              this.config.getDiagnosticCollection().set(rfd.uri, rfd.diagnostics);
            }

            if (result.statusMessage) {
              DialogHelper.showError(result.statusMessage);
              return;
            }

            if (cancellationToken.isCancellationRequested) {
              DialogHelper.showInfo(this.config.getMessage('OperationWasAbortedByUser'));
              return;
            }

            DialogHelper.showInfo(
              this.config.getMessage(
                'View.ObjectTree.Message.BuildAllNormalizationsCompletedSuccessfully'
              )
            );
          } finally {
            const tmpPath = this.config.getTmpDirectoryPath(rootFolder);
            try {
              // Очищаем временные файлы.
              if (fs.lstatSync(tmpPath).isDirectory()) {
                await fs.promises.rmdir(tmpPath, { recursive: true });
              } else {
                await fs.promises.access(tmpPath).then(() => {
                  return fs.promises.unlink(tmpPath);
                });
              }
            } catch (e) {
              Log.warn('Очистка временных файлов', e);
            }
          }
        }
      }
    );
  }

  private getParamsForAllRoots(config: Configuration): any[] {
    const rootPaths = config.getContentRoots();

    return rootPaths.map((rootPath) => {
      const rootFolder = path.basename(rootPath);
      const outputDirectory = config.getOutputDirectoryPath(rootFolder);
      if (!fs.existsSync(outputDirectory)) {
        fs.mkdirSync(outputDirectory, { recursive: true });
      }

      const configBuilder = new SiemjConfBuilder(config, rootPath);
      configBuilder.addNormalizationsGraphBuilding();

      const siemjConfContent = configBuilder.build();
      return { packagesRoot: rootFolder, configContent: siemjConfContent };
    });
  }
}
