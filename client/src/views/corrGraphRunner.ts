import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { FileSystemHelper } from '../helpers/fileSystemHelper';
import { ProcessHelper } from '../helpers/processHelper';
import { Configuration } from '../models/configuration';
import { XpException } from '../models/xpException';
import { SiemjConfBuilder } from '../models/siemj/siemjConfigBuilder';
import { Log } from '../extension';
import { DialogHelper } from '../helpers/dialogHelper';

export class CorrGraphRunnerOptions {
  config: Configuration;
  cancellationToken?: vscode.CancellationToken;

  forceNormalizationsGraphBuilding?: boolean = false;
  forceTablesSchemaBuilding?: boolean = true;
  forceTablesDbBuilding?: boolean = true;
  forceCorrelationsGraphBuilding?: boolean = true;
  forceEnrichmentsGraphBuilding?: boolean = true;
  forceLocalizationsBuilding?: boolean = true;
}

export class CorrGraphRunner {
  constructor(private options: CorrGraphRunnerOptions) {}

  /**
   * Коррелирует события в конверте с помощью корреляционных правил
   * @param contentFullPath путь к правилам для корреляции
   * @param rawEventsFilePath путь к файлу к сырым событиям в конверте
   * @returns корреляционные события
   */
  public async run(contentFullPath: string, rawEventsFilePath: string): Promise<string> {
    if (!fs.existsSync(rawEventsFilePath)) {
      throw new XpException(`Файл сырых событий '${rawEventsFilePath}' недоступен`);
    }

    if (!fs.existsSync(contentFullPath)) {
      throw new XpException(`Директория контента '${contentFullPath}' не существует`);
    }

    const rootPath = this.options.config.getRootByPath(contentFullPath);

    // В зависимости от типа контента получаем нужную выходную директорию.
    const rootFolder = path.basename(rootPath);
    const outputFolder = this.options.config.getOutputDirectoryPath(rootFolder);

    if (!fs.existsSync(outputFolder)) {
      await fs.promises.mkdir(outputFolder, { recursive: true });
    }

    const configBuilder = new SiemjConfBuilder(this.options.config, rootPath);
    configBuilder.addNormalizationsGraphBuilding(this.options.forceNormalizationsGraphBuilding);
    configBuilder.addTablesSchemaBuilding(this.options.forceTablesSchemaBuilding);
    configBuilder.addTablesDbBuilding(this.options.forceTablesDbBuilding);
    configBuilder.addCorrelationsGraphBuilding(this.options.forceCorrelationsGraphBuilding);
    configBuilder.addEnrichmentsGraphBuilding(this.options.forceEnrichmentsGraphBuilding);

    // Собираем локализации для правил.
    configBuilder.addLocalizationsBuilding({
      force: this.options.forceLocalizationsBuilding
    });

    configBuilder.addEventsNormalization({ rawEventsFilePath: rawEventsFilePath });
    configBuilder.addEventsEnrichment();
    configBuilder.addCorrelateEnrichedEvents();
    configBuilder.addLocalizationForCorrelatedEvents();

    const siemjConfContent = configBuilder.build();

    const randTmpDir = this.options.config.getRandTmpSubDirectoryPath(rootFolder);
    await fs.promises.mkdir(randTmpDir, { recursive: true });

    // Сохраняем конфигурационный файл для siemj.
    const siemjConfigPath = path.join(randTmpDir, Configuration.SIEMJ_CONFIG_FILENAME);
    const siemjExePath = this.options.config.getSiemjPath();
    await FileSystemHelper.writeContentFile(siemjConfigPath, siemjConfContent);

    // Без удаления базы возникали странные ошибки filler-а, но это не точно.
    const ftpaDbPath = this.options.config.getFptaDbFilePath(rootFolder);
    if (fs.existsSync(ftpaDbPath)) {
      await fs.promises.unlink(ftpaDbPath);
    }

    // Удаляем коррелированные события, если такие были.
    const corrEventFilePath = this.options.config.getCorrelatedEventsFilePath(rootFolder);
    if (fs.existsSync(corrEventFilePath)) {
      await fs.promises.unlink(corrEventFilePath);
    }

    // Типовая команда выглядит так:
    // "C:\\PTSIEMSDK_GUI.4.0.0.738\\tools\\siemj.exe" -c C:\\PTSIEMSDK_GUI.4.0.0.738\\temp\\siemj.conf main");
    await ProcessHelper.execute(siemjExePath, ['-c', siemjConfigPath, 'main'], {
      encoding: this.options.config.getSiemjOutputEncoding(),
      outputChannel: this.options.config.getOutputChannel(),
      cancellationToken: this.options.cancellationToken
    });

    const corrEventsFilePath = this.options.config.getCorrelatedEventsFilePath(rootFolder);
    if (!fs.existsSync(corrEventsFilePath)) {
      throw new XpException('Ошибка корреляции событий из файлов');
    }

    const ruleLocalizationFilePath =
      this.options.config.getRuleLocaleLocalizationFilePath(rootFolder);
    if (!fs.existsSync(ruleLocalizationFilePath)) {
      DialogHelper.showWarning(
        `Не удалось локализовать корреляционные события, они выведены без локализаций`
      );
      Log.warn(`Файл локализованных событий по пути ${ruleLocalizationFilePath} не был найден`);

      const notLocalizedEventsContent = await FileSystemHelper.readContentFile(corrEventsFilePath);
      await fs.promises.unlink(siemjConfigPath);
      return notLocalizedEventsContent;
    }

    // TODO: поддержать английскую локализацию.
    const localizedEventsContent = await FileSystemHelper.readContentFile(ruleLocalizationFilePath);
    await fs.promises.unlink(siemjConfigPath);
    return localizedEventsContent;
  }
}
