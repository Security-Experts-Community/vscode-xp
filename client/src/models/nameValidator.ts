import * as fs from 'fs';
import * as path from 'path';

import { KbHelper } from '../helpers/kbHelper';
import { Configuration } from './configuration';

export class NameValidator {
  /**
   * Проверяет единицу контента на удовлетворение ограничением по именованию и возвращает ошибку в виде строки.
   * @param name имя item-а
   * @returns описание ошибки
   */
  public static validate(name: string, config: Configuration, parentPath: string): string {
    const trimmed = name.trim();

    if (trimmed === '') {
      return config.getMessage('EmptyName');
    }

    // Корректность имени директории с точки зрения ОС.
    // Английский язык
    const englishAlphabet = /^[a-zA-Z0-9_]*$/;
    if (
      trimmed.includes('>') ||
      trimmed.includes('<') ||
      trimmed.includes(':') ||
      trimmed.includes('"') ||
      trimmed.includes('/') ||
      trimmed.includes('|') ||
      trimmed.includes('?') ||
      trimmed.includes('*') ||
      !englishAlphabet.test(trimmed)
    )
      return config.getMessage('NameContainsInvalidCharacters');

    // Не используем штатные директории контента.
    const contentSubDirectories = KbHelper.getContentSubDirectories();
    if (contentSubDirectories.includes(trimmed)) return config.getMessage('NameReserved');

    // Невозможность создать уже созданную директорию.
    const newFolderPath = path.join(parentPath, trimmed);
    if (fs.existsSync(newFolderPath)) return config.getMessage('AlreadyExists');
  }
}
