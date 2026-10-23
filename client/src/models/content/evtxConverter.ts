import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import moment from 'moment';
import { PromisePool } from '@supercharge/promise-pool';

import { Configuration } from '../configuration';
import { XpException } from '../xpException';
import { OperationCanceledException } from '../operationCanceledException';
import { OsType } from '../locator/pathLocator';
import { ToolsManager } from './toolsManager';
import { LocalToolRunner, ToolRunner } from '../../tools/toolRunner';
import { DateHelper } from '../../helpers/dateHelper';
import { EventMimeType } from '../../helpers/testHelper';
import { Log } from '../../extension';

/**
 * Конвертирует EVTX-файлы в JSON (по событию на строку) встроенной утилитой evtx_converter.
 */
export class EvtxConverter {
  constructor(private readonly config: Configuration) {}

  public static isEvtxFile(filePath: string): boolean {
    return filePath.toLocaleLowerCase().endsWith('.evtx');
  }

  /**
   * Проверяет, что конвертер можно запустить на текущей платформе.
   */
  public async ensureAvailable(): Promise<void> {
    if (this.config.getOsType() === OsType.Mac && !this.config.shouldUseDockerToolRunner()) {
      throw new XpException(this.config.getMessage('Error.MacOsIsNotNativelySupported'));
    }

    const evtxToJsonToolFullPath = this.config.getEvtxToJsonToolFullPath();
    if (!fs.existsSync(evtxToJsonToolFullPath)) {
      throw new XpException(
        `Утилита для конвертации EVTX-файлов в json не найдена по пути '${evtxToJsonToolFullPath}'`
      );
    }

    await ToolsManager.init(this.config);
  }

  /**
   * Конвертирует EVTX-файлы в JSON-файлы `<имя EVTX-файла>.json` в заданной директории.
   * @param outputDirPath директория для JSON-файлов. В Docker-режиме должна быть смонтирована в контейнер.
   * @returns пути к созданным JSON-файлам.
   */
  public async convert(
    evtxFilePaths: string[],
    outputDirPath: string,
    cancellationToken: vscode.CancellationToken
  ): Promise<string[]> {
    const useDocker = this.config.shouldUseDockerToolRunner();
    const evtxToJsonToolFullPath = this.config.getEvtxToJsonToolFullPath();

    const cpuCores = os.cpus().length;
    Log.info(
      `Запущен пул обработки событий из EVTX-файлов на ${cpuCores} параллельных задач для ${evtxFilePaths.length} файлов`
    );

    // Контейнер видит только смонтированные каталоги, поэтому конвертер и EVTX-файлы
    // временно копируются в выходной каталог, который смонтирован в контейнер.
    const stagingDirPath = path.join(outputDirPath, EvtxConverter.STAGING_DIRNAME);
    const toolRunner: ToolRunner = useDocker ? this.config.getToolRunner() : new LocalToolRunner();
    let toolPath = evtxToJsonToolFullPath;
    if (useDocker) {
      await fs.promises.mkdir(stagingDirPath, { recursive: true });
      toolPath = path.join(stagingDirPath, path.basename(evtxToJsonToolFullPath));
      await fs.promises.copyFile(evtxToJsonToolFullPath, toolPath);
      await fs.promises.chmod(toolPath, 0o755);
    }

    const jsonFilePaths = EvtxConverter.getJsonFilePaths(evtxFilePaths, outputDirPath);
    const { results, errors } = await PromisePool.withConcurrency(cpuCores)
      .for(evtxFilePaths)
      .process(async (evtxFilePath, index) => {
        if (!useDocker) {
          return EvtxConverter.convertSingleEvtx(
            toolRunner,
            toolPath,
            evtxFilePath,
            jsonFilePaths[index],
            cancellationToken
          );
        }

        const stagedEvtxFilePath = path.join(
          stagingDirPath,
          `${index}_${path.basename(evtxFilePath)}`
        );
        await fs.promises.copyFile(evtxFilePath, stagedEvtxFilePath, fs.constants.COPYFILE_FICLONE);
        try {
          return await EvtxConverter.convertSingleEvtx(
            toolRunner,
            toolPath,
            stagedEvtxFilePath,
            jsonFilePaths[index],
            cancellationToken
          );
        } finally {
          await fs.promises.rm(stagedEvtxFilePath, { force: true });
        }
      })
      .finally(() => fs.promises.rm(stagingDirPath, { recursive: true, force: true }));

    if (errors.length !== 0) {
      throw errors[0].raw;
    }

    if (results.some((r) => r.isInterrupted)) {
      throw new OperationCanceledException(this.config.getMessage('OperationWasAbortedByUser'));
    }

    if (results.some((r) => r.exitCode !== 0)) {
      Log.warn(`Выполнение хотя бы одной команды завершилось с кодом ошибки, отличным от 0`);
    }

    return jsonFilePaths.filter((p) => fs.existsSync(p));
  }

  /**
   * Имена JSON-файлов повторяют имена EVTX-файлов. Одноимённые EVTX-файлы из разных
   * директорий получают суффикс с номером, чтобы не перезаписать друг друга.
   */
  private static getJsonFilePaths(evtxFilePaths: string[], outputDirPath: string): string[] {
    const usedFileNames = new Set<string>();
    return evtxFilePaths.map((evtxFilePath, index) => {
      let jsonFileName = path.basename(evtxFilePath) + '.json';
      if (usedFileNames.has(jsonFileName)) {
        jsonFileName = `${path.basename(evtxFilePath)}_${index}.json`;
      }
      usedFileNames.add(jsonFileName);
      return path.join(outputDirPath, jsonFileName);
    });
  }

  private static async convertSingleEvtx(
    toolRunner: ToolRunner,
    evtxToJsonToolFullPath: string,
    evtxFilePath: string,
    jsonFilePath: string,
    cancellationToken: vscode.CancellationToken
  ) {
    Log.info(`Начата обработка файла ${evtxFilePath}`);
    const start = moment();

    // В Docker-режиме раннер транслирует хостовые пути в пути внутри контейнера.
    const processResult = await toolRunner.runTool(
      evtxToJsonToolFullPath,
      ['-e', evtxFilePath, '-j', jsonFilePath],
      {
        cancellationToken: cancellationToken
      }
    );

    const end = moment();
    Log.info(
      `Завершена обработка файла ${evtxFilePath} за ${DateHelper.formatDuration(start, end)}`
    );
    return processResult;
  }

  /** MIME-тип событий, которые выдает конвертер. */
  public static readonly EVENTS_MIME: EventMimeType = 'application/x-pt-eventlog';

  private static readonly STAGING_DIRNAME = 'evtx-staging';
}
