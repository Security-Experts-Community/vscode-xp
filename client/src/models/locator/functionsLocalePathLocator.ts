import * as path from 'path';

import { LocalizationService } from '../../l10n/localizationService';
import { BaseLocaleFileLocator } from './baseLocaleFileLocator';

export class FunctionsLocalePathLocator extends BaseLocaleFileLocator {
  constructor(
    currentLanguageTag: string,
    private extensionDirPath: string
  ) {
    super(currentLanguageTag);
  }

  protected getLocaleFilePathImpl(tag: string): string {
    const localeFilePath = path.join(
      this.extensionDirPath,
      LocalizationService.LOCALIZATION_DIRNAME,
      `co.functions.${tag}.json`
    );
    return localeFilePath;
  }
}
