import { Guid } from 'guid-typescript';
import * as path from 'path';
import * as fs from 'fs';

import { Configuration } from '../configuration';
import { XpException } from '../xpException';

export class Origin {
  contentPrefix: string;
  ru: string;
  en: string;
  id: string;
}

export class UserSettingsManager {
  public static async init(config: Configuration): Promise<void> {
    const configuration = config.getWorkspaceConfiguration();

    // Если id нет, задаем.
    const origin = configuration.get<any>(UserSettingsManager.ORIGIN_NAME);
    if (!origin.id) {
      const newGuid = Guid.create().toString();
      origin.id = newGuid;
      await configuration.update(UserSettingsManager.ORIGIN_NAME, origin, true, false);
    }

    // Если выходная директория не задана, то задаем ее.
    let outputDirectoryPath = configuration.get<string>(UserSettingsManager.OUTPUT_DIRECTORY_PATH);
    if (!outputDirectoryPath) {
      outputDirectoryPath = path.join(
        config.getExtensionTmpDirectoryPath(),
        UserSettingsManager.DEFAULT_OUTPUT_DIR_NAME
      );
      await configuration.update(
        UserSettingsManager.OUTPUT_DIRECTORY_PATH,
        outputDirectoryPath,
        true,
        false
      );
    }

    // Если выходная директория не создана, создаем.
    if (!fs.existsSync(outputDirectoryPath)) {
      await fs.promises.mkdir(outputDirectoryPath, { recursive: true });
    }
  }

  public static async getCurrentOrigin(config: Configuration): Promise<any> {
    const configuration = config.getWorkspaceConfiguration();
    const origin = configuration.get<Origin>(UserSettingsManager.ORIGIN_NAME);
    const id = origin?.id;

    const contentPrefix = origin?.contentPrefix;
    if (!contentPrefix) {
      throw UserSettingsManager.getParamException('contentPrefix');
    }

    const ru = origin?.ru;
    if (!ru) {
      throw UserSettingsManager.getParamException('ru');
    }

    const en = origin?.en;
    if (!en) {
      throw UserSettingsManager.getParamException('en');
    }

    // Автоматически генерируем id
    if (!id) {
      const newGuid = Guid.create().toString();
      origin.id = newGuid;
      await configuration.update(UserSettingsManager.ORIGIN_NAME, origin, true, false);
    }

    // [
    // 	{
    // 		"Id": "95a1cca9-50b5-4fae-91a2-26aa36648c3c",
    // 		"SystemName": "SEC",
    // 		"Nickname": "SEC",
    // 		"DisplayName": [
    // 			{
    // 				"Locale": "ru",
    // 				"Value": "Security Experts Community"
    // 			},
    // 			{
    // 				"Locale": "en",
    // 				"Value": "Security Experts Community"
    // 			}
    // 		],
    // 		"Revision": 1
    // 	}
    // ]

    return [
      {
        Id: id,
        SystemName: contentPrefix,
        Nickname: contentPrefix,
        DisplayName: [
          {
            Locale: 'ru',
            Value: ru
          },
          {
            Locale: 'en',
            Value: en
          }
        ],
        Revision: 1
      }
    ];
  }

  private static getParamException(paramName: string): XpException {
    return new XpException(
      `Не задан поставщик для экспорта KB-файла. Задайте параметр [${paramName}](command:workbench.action.openSettings?["xpConfig.origin"]) и повторите`
    );
  }

  public static readonly DEFAULT_OUTPUT_DIR_NAME = 'output';

  public static readonly ORIGIN_NAME = 'origin';
  public static readonly OUTPUT_DIRECTORY_PATH = 'outputDirectoryPath';
}
