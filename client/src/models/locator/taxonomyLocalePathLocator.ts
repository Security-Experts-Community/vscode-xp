import * as path from 'path';

import { BaseLocaleFileLocator } from './baseLocaleFileLocator';
import { Localization } from '../content/localization';

export class TaxonomyLocalePathLocator extends BaseLocaleFileLocator {
  constructor(
    currentLanguageTag: string,
    private taxonomyDirPath: string
  ) {
    super(currentLanguageTag);
  }

  protected getLocaleFilePathImpl(tag: string): string {
    const localeFilePath = path.join(
      this.taxonomyDirPath,
      Localization.LOCALIZATIONS_DIRNAME,
      `i18n_${tag}.yaml`
    );
    return localeFilePath;
  }
}
