import * as path from 'path';
import * as fs from 'fs';

import { Configuration } from '../configuration';

export class SiemjConfigHelper {
  public static async saveSiemjConfig(
    siemjConfigContent: string,
    siemjConfigPath: string
  ): Promise<void> {
    // Проверяем, что директория для записи файла существует
    const siemjFolder = path.dirname(siemjConfigPath);
    if (!fs.existsSync(siemjFolder)) {
      fs.mkdirSync(siemjFolder, { recursive: true });
    }
    // Сохраняем конфигурационный файл для siemj.
    return fs.promises.writeFile(siemjConfigPath, siemjConfigContent);
  }

  /**
   * Очищаем артефакты запуска siemj. Необходимо для невозможности получения неактуальных данных из них.
   */
  public static async clearArtifacts(
    config: Configuration,
    options?: { keepTablesDb?: boolean }
  ): Promise<void> {
    const roots = config.getContentRoots();

    for (const root of roots) {
      const outputDirName = path.basename(root);

      // БД табличных списков может переиспользоваться из кеша сборки.
      if (!options?.keepTablesDb) {
        const ftpdDbFilePath = config.getFptaDbFilePath(outputDirName);
        // Новые версии siemj создают БД как директорию.
        await fs.promises.rm(ftpdDbFilePath, { recursive: true, force: true });
      }

      const normEventsFilePath = config.getNormalizedEventsFilePath(outputDirName);
      if (fs.existsSync(normEventsFilePath)) {
        await fs.promises.unlink(normEventsFilePath);
      }

      const enrichEventsFilePath = config.getEnrichedEventsFilePath(outputDirName);
      if (fs.existsSync(enrichEventsFilePath)) {
        await fs.promises.unlink(enrichEventsFilePath);
      }
    }
  }
}
