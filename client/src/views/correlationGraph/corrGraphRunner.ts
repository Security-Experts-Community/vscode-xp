import * as fs from 'fs';
import * as path from 'path';

import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { Configuration } from '../../models/configuration';
import { XpException } from '../../models/xpException';
import { SiemjConfBuilder } from '../../models/siemj/siemjConfigBuilder';
import { SiemjManager } from '../../models/siemj/siemjManager';

export class CorrGraphRunner {
  constructor(private config: Configuration) {}

  public async run(correlationsFullPath: string, rawEventsFilePath: string): Promise<string> {
    if (!fs.existsSync(rawEventsFilePath)) {
      throw new XpException(`Файл сырых событий '${rawEventsFilePath}' не доступен`);
    }

    if (!fs.existsSync(correlationsFullPath)) {
      throw new XpException(`Директория контента '${correlationsFullPath}' не существует`);
    }

    const rootPath = this.config.getRootByPath(correlationsFullPath);

    // В зависимости от типа контента получаем нужную выходную директорию.
    const rootFolder = path.basename(rootPath);
    const outputFolder = this.config.getOutputDirectoryPath(rootFolder);

    if (!fs.existsSync(outputFolder)) {
      await fs.promises.mkdir(outputFolder, { recursive: true });
    }

    const configBuilder = new SiemjConfBuilder(this.config, rootPath);
    configBuilder.addNormalizationsGraphBuilding(false);
    configBuilder.addTablesSchemaBuilding();
    configBuilder.addTablesDbBuilding();
    configBuilder.addCorrelationsGraphBuilding();
    configBuilder.addEnrichmentsGraphBuilding();

    configBuilder.addEventsNormalization({ rawEventsFilePath: rawEventsFilePath });
    configBuilder.addEventsEnrichment();
    configBuilder.addCorrelateEnrichedEvents();

    const siemjConfContent = configBuilder.build();

    const randTmpDir = this.config.getRandTmpSubDirectoryPath(rootFolder);
    await fs.promises.mkdir(randTmpDir, { recursive: true });

    // Сохраняем конфигурационный файл для siemj.
    const siemjConfigPath = path.join(randTmpDir, Configuration.SIEMJ_CONFIG_FILENAME);
    await FileSystemHelper.writeContentFile(siemjConfigPath, siemjConfContent);

    // Без удаления базы возникали странные ошибки filler-а, но это не точно.
    const ftpaDbPath = this.config.getFptaDbFilePath(rootFolder);
    if (fs.existsSync(ftpaDbPath)) {
      await fs.promises.unlink(ftpaDbPath);
    }

    // Удаляем коррелированные события, если такие были.
    const corrEventFilePath = this.config.getCorrelatedEventsFilePath(rootFolder);
    if (fs.existsSync(corrEventFilePath)) {
      await fs.promises.unlink(corrEventFilePath);
    }

    const siemjManager = new SiemjManager(this.config);
    await siemjManager.executeSiemjConfig(correlationsFullPath, siemjConfContent);

    const corrEventsFilePath = this.config.getCorrelatedEventsFilePath(rootFolder);
    if (!fs.existsSync(corrEventsFilePath)) {
      throw new XpException(
        'Корреляционные события не получены. [Смотри Output](command:xp.commonCommands.showOutputChannel)'
      );
    }

    const normEventsContent = await FileSystemHelper.readContentFile(corrEventsFilePath);
    await fs.promises.unlink(siemjConfigPath);
    return normEventsContent;
  }
}
