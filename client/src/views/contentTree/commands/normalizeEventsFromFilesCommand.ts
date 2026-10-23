import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as vscode from 'vscode';
import { once } from 'events';

import { Configuration } from '../../../models/configuration';
import { SiemJOutputParser } from '../../../models/siemj/siemJOutputParser';
import { SiemjManager } from '../../../models/siemj/siemjManager';
import { ViewCommand } from '../../../models/command/command';
import { OperationCanceledException } from '../../../models/operationCanceledException';
import { XpException } from '../../../models/xpException';
import { DialogHelper } from '../../../helpers/dialogHelper';
import { EventMimeType } from '../../../helpers/testHelper';
import { EvtxConverter } from '../../../models/content/evtxConverter';
import { Enveloper } from '../../../models/enveloper';
import { Log } from '../../../extension';

interface EventsFormatItem extends vscode.QuickPickItem {
  mime?: EventMimeType;
}

/**
 * Нормализует поток событий из файлов: собирает граф формул нормализации выбранной
 * корневой директории контента и прогоняет через него события с помощью siemj.
 */
export class NormalizeEventsFromFilesCommand extends ViewCommand {
  constructor(
    private config: Configuration,
    private outputParser: SiemJOutputParser
  ) {
    super();
  }

  public async execute(): Promise<void> {
    if (!this.config.isKbOpened()) {
      DialogHelper.showWarning(
        this.config.getMessage('View.ObjectTree.Message.NeedToOpenKnowledgeBase')
      );
      return;
    }

    const eventsFileUris = await vscode.window.showOpenDialog({
      canSelectMany: true,
      canSelectFolders: false,
      canSelectFiles: true,
      title: this.config.getMessage('View.NormalizeEventsFromFiles.SelectFiles'),
      openLabel: this.config.getMessage('View.NormalizeEventsFromFiles.Normalize')
    });
    if (!eventsFileUris || eventsFileUris.length === 0) {
      return;
    }

    const eventsFilePaths = eventsFileUris.map((u) => u.fsPath);
    const evtxFilePaths = eventsFilePaths.filter((p) => EvtxConverter.isEvtxFile(p));
    const otherFilePaths = eventsFilePaths.filter((p) => !EvtxConverter.isEvtxFile(p));

    const evtxConverter = new EvtxConverter(this.config);
    if (evtxFilePaths.length !== 0) {
      await evtxConverter.ensureAvailable();
    }

    // Формат событий известен только для EVTX-файлов, для остальных его выбирает пользователь.
    let eventsFormat: EventsFormatItem;
    if (otherFilePaths.length !== 0) {
      eventsFormat = await this.selectEventsFormat();
      if (!eventsFormat) {
        return;
      }
    }

    const contentRootPath = await this.selectContentRoot();
    if (!contentRootPath) {
      return;
    }

    const rootFolder = path.basename(contentRootPath);
    const forceGraphBuilding = await this.askForceGraphBuilding(rootFolder);
    if (forceGraphBuilding === undefined) {
      return;
    }

    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
        title: this.config.getMessage('View.NormalizeEventsFromFiles.Title')
      },
      async (progress, cancellationToken: vscode.CancellationToken) => {
        // Каталог запуска лежит в выходной директории, которую видит и siemj в контейнере.
        const runDirPath = this.config.getRandTmpSubDirectoryPath(rootFolder);
        await fs.promises.mkdir(runDirPath, { recursive: true });

        const rawEventsFilePath = path.join(
          runDirPath,
          NormalizeEventsFromFilesCommand.RAW_EVENTS_FILENAME
        );
        const evtxJsonDirPath = path.join(runDirPath, NormalizeEventsFromFilesCommand.EVTX_DIRNAME);

        // Сырые события сохраняются вместе с результатом только при успешной нормализации.
        let keepRawEvents = false;
        try {
          let evtxJsonFilePaths: string[] = [];
          if (evtxFilePaths.length !== 0) {
            progress.report({
              message: this.config.getMessage(
                'View.NormalizeEventsFromFiles.Progress.ConvertingEvtx',
                evtxFilePaths.length
              )
            });
            await fs.promises.mkdir(evtxJsonDirPath, { recursive: true });
            evtxJsonFilePaths = await evtxConverter.convert(
              evtxFilePaths,
              evtxJsonDirPath,
              cancellationToken
            );
          }

          progress.report({
            message: this.config.getMessage(
              'View.NormalizeEventsFromFiles.Progress.PreparingEvents'
            )
          });
          const rawEventsMime = await NormalizeEventsFromFilesCommand.prepareEvents(
            evtxJsonFilePaths,
            otherFilePaths,
            eventsFormat?.mime,
            rawEventsFilePath
          );

          if (cancellationToken.isCancellationRequested) {
            throw new OperationCanceledException(
              this.config.getMessage('OperationWasAbortedByUser')
            );
          }

          const normEventsFilePath = this.config.getNormalizedEventsFilePath(rootFolder);
          const notNormEventsFilePath = path.join(
            this.config.getOutputDirectoryPath(rootFolder),
            this.config.getNotNormalizedEventsFileName()
          );
          await fs.promises.rm(normEventsFilePath, { force: true });
          await fs.promises.rm(notNormEventsFilePath, { force: true });

          const siemjManager = new SiemjManager(this.config, cancellationToken);
          const configBuilder = siemjManager.getConfigBuilder(contentRootPath);
          configBuilder.addNormalizationsGraphBuilding(forceGraphBuilding);
          configBuilder.addEventsNormalization({
            rawEventsFilePath: rawEventsFilePath,
            mime: rawEventsMime
          });
          const siemjConfContent = configBuilder.build();

          progress.report({
            message: this.config.getMessage('View.NormalizeEventsFromFiles.Progress.Normalization')
          });
          this.config.getDiagnosticCollection().clear();
          const siemjExecutionResult = await siemjManager.executeSiemjConfig(
            contentRootPath,
            siemjConfContent
          );

          if (siemjExecutionResult.isInterrupted) {
            throw new OperationCanceledException(
              this.config.getMessage('OperationWasAbortedByUser')
            );
          }

          // Выводим ошибки компиляции формул нормализации.
          const result = await this.outputParser.parse(siemjExecutionResult.output);
          for (const rfd of result.fileDiagnostics) {
            this.config.getDiagnosticCollection().set(rfd.uri, rfd.diagnostics);
          }

          if (result.statusMessage) {
            DialogHelper.showError(result.statusMessage);
            return;
          }

          if (!fs.existsSync(normEventsFilePath)) {
            this.config.getOutputChannel().show();
            throw new XpException(
              this.config.getMessage('View.NormalizeEventsFromFiles.Message.NoResultFile')
            );
          }

          // Сохраняем результат рядом с исходными событиями, чтобы его не перезаписали
          // следующие запуски нормализации.
          const resultNormEventsFilePath = path.join(
            runDirPath,
            this.config.getNormalizedEventsFileName()
          );
          await fs.promises.copyFile(normEventsFilePath, resultNormEventsFilePath);

          // siemj не создает файл, если все события нормализованы.
          const resultNotNormEventsFilePath = path.join(
            runDirPath,
            this.config.getNotNormalizedEventsFileName()
          );
          if (fs.existsSync(notNormEventsFilePath)) {
            await fs.promises.copyFile(notNormEventsFilePath, resultNotNormEventsFilePath);
          } else {
            await fs.promises.writeFile(resultNotNormEventsFilePath, '');
          }
          keepRawEvents = true;

          const normEventsCount =
            await NormalizeEventsFromFilesCommand.countEvents(resultNormEventsFilePath);
          const notNormEventsCount = await NormalizeEventsFromFilesCommand.countEvents(
            resultNotNormEventsFilePath
          );
          Log.info(
            `Normalized events: ${normEventsCount}, not normalized events: ${notNormEventsCount}. Results are saved to '${runDirPath}'`
          );

          // Нормализованные события открываем последними, чтобы их вкладка была активной.
          for (const eventsFilePath of [
            rawEventsFilePath,
            resultNotNormEventsFilePath,
            resultNormEventsFilePath
          ]) {
            await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(eventsFilePath), {
              preview: false
            });
          }

          this.showResult(normEventsCount, notNormEventsCount);
        } finally {
          if (!keepRawEvents) {
            await fs.promises.rm(rawEventsFilePath, { force: true });
          }
          await fs.promises.rm(evtxJsonDirPath, { recursive: true, force: true });
        }
      }
    );
  }

  private showResult(normEventsCount: number, notNormEventsCount: number): void {
    const message = this.config.getMessage(
      'View.NormalizeEventsFromFiles.Message.Result',
      normEventsCount,
      notNormEventsCount
    );
    if (notNormEventsCount === 0) {
      DialogHelper.showInfo(message);
    } else {
      DialogHelper.showWarning(message);
    }
  }

  private async selectEventsFormat(): Promise<EventsFormatItem | undefined> {
    const rawEventsDescription = this.config.getMessage(
      'View.NormalizeEventsFromFiles.RawEventsDescription'
    );
    const items: EventsFormatItem[] = [
      {
        label: this.config.getMessage('View.NormalizeEventsFromFiles.EnvelopedEvents'),
        description: 'JSON Lines'
      },
      ...NormalizeEventsFromFilesCommand.RAW_EVENTS_MIME_TYPES.map((mime) => ({
        label: mime,
        description: rawEventsDescription,
        mime: mime
      }))
    ];

    return vscode.window.showQuickPick(items, {
      placeHolder: this.config.getMessage('View.NormalizeEventsFromFiles.SelectFormat'),
      ignoreFocusOut: true
    });
  }

  private async selectContentRoot(): Promise<string | undefined> {
    const contentRoots = this.config.getContentRoots();
    if (contentRoots.length === 1) {
      return contentRoots[0];
    }

    const selected = await vscode.window.showQuickPick(
      contentRoots.map((rootPath) => ({ label: path.basename(rootPath), rootPath: rootPath })),
      {
        placeHolder: this.config.getMessage('View.NormalizeEventsFromFiles.SelectContentRoot'),
        ignoreFocusOut: true
      }
    );
    return selected?.rootPath;
  }

  /**
   * Если граф нормализации уже собран, спрашивает, нужно ли его пересобрать.
   * @returns `undefined`, если пользователь отказался от выбора.
   */
  private async askForceGraphBuilding(rootFolder: string): Promise<boolean | undefined> {
    const normGraphFilePath = this.config.getNormalizationsGraphFilePath(rootFolder);
    if (!fs.existsSync(normGraphFilePath)) {
      return true;
    }

    const rebuild = this.config.getMessage('View.NormalizeEventsFromFiles.RebuildGraph');
    const useExisting = this.config.getMessage('View.NormalizeEventsFromFiles.UseExistingGraph');
    const userDecision = await vscode.window.showInformationMessage(
      this.config.getMessage('View.NormalizeEventsFromFiles.GraphAlreadyBuilt', rootFolder),
      { modal: true },
      rebuild,
      useExisting
    );

    switch (userDecision) {
      case rebuild:
        return true;
      case useExisting:
        return false;
      default:
        return undefined;
    }
  }

  /**
   * Готовит единый поток событий для нормализатора в файле `resultFilePath`.
   * @returns MIME-тип событий без конверта или `undefined`, если события в конверте.
   */
  private static async prepareEvents(
    evtxJsonFilePaths: string[],
    otherFilePaths: string[],
    otherFilesMime: EventMimeType | undefined,
    resultFilePath: string
  ): Promise<EventMimeType | undefined> {
    if (evtxJsonFilePaths.length === 0) {
      await NormalizeEventsFromFilesCommand.writeEvents(resultFilePath, (output) =>
        NormalizeEventsFromFilesCommand.appendEventsFiles(otherFilePaths, output)
      );
      return otherFilesMime;
    }

    // События из EVTX-файлов сохраняем в конверте. Нормализатор принимает сырые события
    // только одного MIME-типа, поэтому события остальных файлов тоже оборачиваем в конверт.
    await NormalizeEventsFromFilesCommand.writeEvents(resultFilePath, async (output) => {
      await NormalizeEventsFromFilesCommand.appendEnvelopedEvents(
        evtxJsonFilePaths,
        EvtxConverter.EVENTS_MIME,
        output
      );
      if (otherFilesMime) {
        await NormalizeEventsFromFilesCommand.appendEnvelopedEvents(
          otherFilePaths,
          otherFilesMime,
          output
        );
      } else {
        await NormalizeEventsFromFilesCommand.appendEventsFiles(otherFilePaths, output);
      }
    });
    return undefined;
  }

  private static async writeEvents(
    resultFilePath: string,
    write: (output: fs.WriteStream) => Promise<void>
  ): Promise<void> {
    const output = fs.createWriteStream(resultFilePath);
    try {
      await write(output);
    } finally {
      output.end();
      await once(output, 'close');
    }
  }

  /**
   * Дописывает файлы в поток событий: нормализатор читает по событию на строку,
   * поэтому BOM в начале файлов убирается, а между файлами гарантируется перевод строки.
   */
  private static async appendEventsFiles(
    eventsFilePaths: string[],
    output: fs.WriteStream
  ): Promise<void> {
    for (const eventsFilePath of eventsFilePaths) {
      let isFirstChunk = true;
      let lastByte = NormalizeEventsFromFilesCommand.LF;
      for await (const chunk of fs.createReadStream(eventsFilePath)) {
        let buffer = chunk as Buffer;
        if (
          isFirstChunk &&
          buffer.subarray(0, 3).equals(NormalizeEventsFromFilesCommand.UTF8_BOM)
        ) {
          buffer = buffer.subarray(3);
        }
        isFirstChunk = false;

        if (buffer.length === 0) {
          continue;
        }

        lastByte = buffer[buffer.length - 1];
        await NormalizeEventsFromFilesCommand.write(output, buffer);
      }

      if (lastByte !== NormalizeEventsFromFilesCommand.LF) {
        await NormalizeEventsFromFilesCommand.write(output, '\n');
      }
    }
  }

  /**
   * Дописывает в поток события из файлов, обернув каждую строку в конверт заданного MIME-типа.
   */
  private static async appendEnvelopedEvents(
    eventsFilePaths: string[],
    mime: EventMimeType,
    output: fs.WriteStream
  ): Promise<void> {
    for (const eventsFilePath of eventsFilePaths) {
      const rl = readline.createInterface({
        input: fs.createReadStream(eventsFilePath),
        crlfDelay: Infinity
      });

      let isFirstLine = true;
      for await (let line of rl) {
        if (isFirstLine) {
          line = line.replace(/^\uFEFF/, '');
          isFirstLine = false;
        }

        if (!line.trim()) {
          continue;
        }

        const [envelopedEvent] = Enveloper.addEventsToEnvelope([line], mime);
        await NormalizeEventsFromFilesCommand.write(output, envelopedEvent + '\n');
      }
    }
  }

  private static async write(output: fs.WriteStream, data: Buffer | string): Promise<void> {
    if (!output.write(data)) {
      await once(output, 'drain');
    }
  }

  private static async countEvents(eventsFilePath: string): Promise<number> {
    const rl = readline.createInterface({
      input: fs.createReadStream(eventsFilePath),
      crlfDelay: Infinity
    });

    let eventsCount = 0;
    for await (const line of rl) {
      if (line.trim()) {
        eventsCount++;
      }
    }
    return eventsCount;
  }

  private static readonly RAW_EVENTS_FILENAME = 'raw_events.jsonl';
  private static readonly EVTX_DIRNAME = 'evtx';
  private static readonly RAW_EVENTS_MIME_TYPES: EventMimeType[] = [
    'application/x-pt-eventlog',
    'application/json',
    'text/plain',
    'text/csv',
    'text/xml'
  ];
  private static readonly UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);
  private static readonly LF = 0x0a;
}
