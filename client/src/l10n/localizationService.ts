import * as fs from 'fs';
import * as path from 'path';

import locale, { ILocale } from 'locale-codes';

import { XpException } from '../models/xpException';
import { LocalizationSuite } from './localizationSuite';

export class LocalizationService {
  private readonly currentLocalization: LocalizationSuite;
  // For localized plugins property in settings, cause vscode doesn't handle it explicitly when changing localization
  private readonly allSupportedLocalizations: Set<LocalizationSuite>;
  private additionallySupportedLanguageTags: string[];
  private extensionPath: string;

  private defaultLanguageTag = 'en';
  private magicalConst = 1024; // idk why, but locale lib returns lcid values reduced by 1024
  public readonly locale: ILocale;

  constructor(currentLanguageTag: string, extensionPath: string) {
    this.extensionPath = extensionPath;

    this.locale = locale.getByTag(currentLanguageTag);

    this.additionallySupportedLanguageTags = this.getAdditionalSupportedLanguageTags();
    this.allSupportedLocalizations = this.getAllLocalizations();

    const userLocalization = this.getLocalizationOrUndefined(this.locale.tag);

    this.currentLocalization = userLocalization
      ? userLocalization
      : this.getLocalizationOrUndefined(this.defaultLanguageTag)!;
  }

  public getCurrentLcid(): number {
    return this.locale.lcid + this.magicalConst;
  }

  public getMessage(
    messageKey: string,
    ...args: (string | number | boolean | undefined | null)[]
  ): string {
    return this.currentLocalization.getMessage(messageKey, ...args);
  }

  public getLocalizationKeyByLocalizedValue(
    localizedValue: string,
    checkInAllLocalization = false
  ): string {
    if (checkInAllLocalization) {
      return this.findLocalizationKeyByValueInAllLocalizations(localizedValue);
    }

    const localizationKey =
      this.currentLocalization.getLocalizationKeyByLocalizedValue(localizedValue);
    if (localizationKey) {
      return localizationKey;
    }

    throw new XpException(`Can't find key for ${localizedValue} localized resource.`);
  }

  public isUserLocalizationSupported(): boolean {
    return this.currentLocalization.localizationTag === this.locale.tag;
  }

  private getDefaultLocalization(): LocalizationSuite {
    return new LocalizationSuite(
      path.join(this.extensionPath, `package.nls.json`),
      path.join(
        this.extensionPath,
        LocalizationService.LOCALIZATION_DIRNAME,
        `${LocalizationService.LOCALIZATION_FILE_PREFIX}.nls.${this.defaultLanguageTag}.json`
      ),
      this.defaultLanguageTag,
      path.join(
        this.extensionPath,
        LocalizationService.LOCALIZATION_DIRNAME,
        `not-localized.nls.json`
      )
    );
  }

  private findLocalizationKeyByValueInAllLocalizations(localizedValue: string): string {
    for (const localization of this.allSupportedLocalizations) {
      const localizationKey = localization.getLocalizationKeyByLocalizedValue(localizedValue);
      if (localizationKey) {
        return localizationKey;
      }
    }

    throw new XpException(`Can't find key for ${localizedValue} localized resource.`);
  }

  private getLocalizationOrUndefined(tag: string): LocalizationSuite | undefined {
    return [...this.allSupportedLocalizations].find(
      (localizationSuit) => localizationSuit.localizationTag === tag
    );
  }

  private getAllLocalizations(): Set<LocalizationSuite> {
    const localizations: Set<LocalizationSuite> = new Set();
    localizations.add(this.getDefaultLocalization());

    for (const tag of this.additionallySupportedLanguageTags) {
      localizations.add(
        new LocalizationSuite(
          path.join(this.extensionPath, `package.nls.${tag}.json`),
          path.join(
            this.extensionPath,
            LocalizationService.LOCALIZATION_DIRNAME,
            `${LocalizationService.LOCALIZATION_FILE_PREFIX}.nls.${tag}.json`
          ),
          tag
        )
      );
    }
    return localizations;
  }

  private getAdditionalSupportedLanguageTags(): string[] {
    const extractLanguageTag = (fileName: string) => {
      const startIndex = fileName.indexOf('.nls.') + '.nls.'.length;
      const endIndex = fileName.indexOf('.json');
      const extractedLanguageTag = fileName.substring(startIndex, endIndex);

      return extractedLanguageTag;
    };

    const localizationFolder = path.join(
      this.extensionPath,
      LocalizationService.LOCALIZATION_DIRNAME
    );
    const additionalSupportedLanguageTags: string[] = [];

    fs.readdirSync(localizationFolder)
      .filter((fileName) => fileName.startsWith(LocalizationService.LOCALIZATION_FILE_PREFIX))
      .forEach((localizationFile) => {
        const languageTag = extractLanguageTag(localizationFile);
        if (languageTag !== this.defaultLanguageTag) {
          additionalSupportedLanguageTags.push(languageTag);
        }
      });

    return additionalSupportedLanguageTags;
  }

  public static LOCALIZATION_FILE_PREFIX = 'xp';
  public static LOCALIZATION_DIRNAME = 'l10n';
}
