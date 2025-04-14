import * as path from 'path';
import * as fs from 'fs';

import { MetaInfoEventDescription } from '../metaInfo/metaInfoEventDescription';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { YamlHelper } from '../../helpers/yamlHelper';
import { MetaInfo } from '../metaInfo/metaInfo';
import { Log } from '../../extension';

export enum LocalizationLanguage {
  Ru = 1,
  En
}

export class LocalizationExample {
  public ruText: string;
  public enText: string;
  public correlationName: string;
}

export class Localization {
  private constructor() {
    //
  }

  public setRuDescription(description: string): void {
    this._ruDescription = description;
  }

  public getRuDescription(): string {
    return this._ruDescription;
  }

  public setEnDescription(description: string): void {
    this._enDescription = description;
  }

  public getEnDescription(): string {
    return this._enDescription;
  }

  public setCriteria(criteria: string): void {
    this._criteria = criteria;
  }

  public getCriteria(): string {
    return this._criteria;
  }

  public setLocalizationId(localizationId: string): void {
    this._localizationId = localizationId;
  }

  public getLocalizationId(): string {
    return this._localizationId;
  }

  public setRuLocalizationText(localization: string): void {
    this._ruLocalizationTemplate = localization;
  }

  public setEnLocalizationText(localization: string): void {
    this._enLocalizationTemplate = localization;
  }

  public getEnLocalizationText(): string {
    return this._enLocalizationTemplate;
  }

  public getRuLocalizationText(): string {
    return this._ruLocalizationTemplate;
  }

  public static async parseFromDirectory(ruleDirectoryPath: string): Promise<Localization[]> {
    // Читаем русские локализации.
    // TODO: Если будет только английская локализация, то оно будет проигнорирована.
    const ruLocFilePath = path.join(
      ruleDirectoryPath,
      Localization.LOCALIZATIONS_DIRNAME,
      Localization.RU_LOCALIZATION_FILENAME
    );
    if (!fs.existsSync(ruLocFilePath)) {
      return [];
    }

    const ruLocContent = await FileSystemHelper.readContentFile(ruLocFilePath);
    const ruLocObject = YamlHelper.parse(ruLocContent);

    const ruEventDescriptionsObject = ruLocObject?.EventDescriptions ?? ([] as any[]);
    const ruDescription = ruLocObject?.Description ?? ('' as string);

    // Читаем английские локализации, если такие есть.
    const enLocFilePath = path.join(
      ruleDirectoryPath,
      Localization.LOCALIZATIONS_DIRNAME,
      Localization.EN_LOCALIZATION_FILENAME
    );

    let enEventDescriptionsObject: any[] = [];
    let enDescription: string;
    if (fs.existsSync(enLocFilePath)) {
      const enLocContent = await FileSystemHelper.readContentFile(enLocFilePath);
      const enLocObject = YamlHelper.parse(enLocContent);

      enEventDescriptionsObject = enLocObject?.EventDescriptions ?? ([] as any[]);
      enDescription = enLocObject?.Description ?? ('' as string);
    }

    // Читаем метаданные для извлечения критериев локализаций.
    const eventDescriptions = await this.parseEventDescriptions(ruleDirectoryPath);

    const localizations: Localization[] = [];
    if (ruEventDescriptionsObject) {
      ruEventDescriptionsObject.forEach((ruEdp) => {
        const localization = new Localization();

        if (!ruEdp.LocalizationId) {
          Log.warn('Не задан LocalizationId в метаинформации правила');
        }

        localization.setLocalizationId(ruEdp.LocalizationId);

        if (!ruEdp.EventDescription) {
          Log.warn('Не задан EventDescription в метаинформации');
        }
        localization.setRuLocalizationText(ruEdp.EventDescription);
        localization.setRuDescription(ruDescription);

        const enEventDescription = enEventDescriptionsObject.find(
          (enEdp) => enEdp.LocalizationId == ruEdp.LocalizationId
        );

        // Если нет английской локализации, то ничего страшного.
        if (enEventDescription) {
          localization.setEnLocalizationText(enEventDescription.EventDescription);
        } else {
          localization.setEnLocalizationText('');
        }

        if (enDescription) {
          localization.setEnDescription(enDescription);
        }

        // Добавляем критерий из метаданных.
        const localizationEventDescription = eventDescriptions.find(
          (ed) => ed.getLocalizationId() == ruEdp.LocalizationId
        );
        if (localizationEventDescription) {
          const localizationCriteria = localizationEventDescription.getCriteria();
          localization.setCriteria(localizationCriteria);
        }

        localizations.push(localization);
      });
    }

    return localizations;
  }

  public static async parseEventDescriptions(
    ruleDirFullPath: string
  ): Promise<MetaInfoEventDescription[]> {
    // Читаем метаинформацию.
    const metaInfoFullPath = path.join(ruleDirFullPath, MetaInfo.METAINFO_FILENAME);
    const yamlContent = fs.readFileSync(metaInfoFullPath, 'utf8');
    const metaInfoPlain = YamlHelper.parse(yamlContent);

    const eventDescriptionsPlain = metaInfoPlain.EventDescriptions as any[];

    if (!eventDescriptionsPlain) {
      // Для обогащений есть общее описание, но нет EventDescription
      return [];
    }

    const eventDescriptions = eventDescriptionsPlain.map((edp) => {
      const eventDesc = new MetaInfoEventDescription();
      eventDesc.setCriteria(edp.Criteria);
      eventDesc.setLocalizationId(edp.LocalizationId);
      return eventDesc;
    });

    return eventDescriptions;
  }

  public static create(
    criteria: string,
    ruLocalizationText: string,
    enLocalizationText: string
  ): Localization {
    const newLocalization = new Localization();
    newLocalization.setCriteria(criteria);
    newLocalization.setRuLocalizationText(ruLocalizationText);
    newLocalization.setEnLocalizationText(enLocalizationText);
    return newLocalization;
  }

  public static async parseRuDescription(fullPath: string): Promise<string> {
    const ruLocFilePath = path.join(
      fullPath,
      this.LOCALIZATIONS_DIRNAME,
      this.RU_LOCALIZATION_FILENAME
    );
    if (!fs.existsSync(ruLocFilePath)) {
      return '';
    }

    const ruLocContent = await FileSystemHelper.readContentFile(ruLocFilePath);
    const ruLocObject = YamlHelper.parse(ruLocContent);

    if (!ruLocObject?.Description) {
      return '';
    }

    return ruLocObject.Description;
  }

  public static async parseEnDescription(fullPath: string): Promise<string> {
    const enLocFilePath = path.join(
      fullPath,
      this.LOCALIZATIONS_DIRNAME,
      this.EN_LOCALIZATION_FILENAME
    );
    if (!fs.existsSync(enLocFilePath)) {
      return '';
    }

    const enLocContent = await FileSystemHelper.readContentFile(enLocFilePath);
    const enLocObject = YamlHelper.parse(enLocContent);

    if (!enLocObject?.Description) {
      return '';
    }

    return enLocObject.Description;
  }

  public static async parseRuWhitelistingDescriptions(fullPath: string): Promise<string> {
    const ruLocFilePath = path.join(
      fullPath,
      this.LOCALIZATIONS_DIRNAME,
      this.RU_LOCALIZATION_FILENAME
    );
    if (!fs.existsSync(ruLocFilePath)) {
      return '';
    }

    const ruLocContent = await FileSystemHelper.readContentFile(ruLocFilePath);
    const ruLocObject = YamlHelper.parse(ruLocContent);

    return ruLocObject.WhitelistingDescriptions;
  }

  public static async parseEnWhitelistingDescriptions(fullPath: string): Promise<string> {
    const ruLocFilePath = path.join(
      fullPath,
      this.LOCALIZATIONS_DIRNAME,
      this.EN_LOCALIZATION_FILENAME
    );
    if (!fs.existsSync(ruLocFilePath)) {
      return '';
    }

    const ruLocContent = await FileSystemHelper.readContentFile(ruLocFilePath);
    const ruLocObject = YamlHelper.parse(ruLocContent);

    return ruLocObject.WhitelistingDescriptions;
  }

  private _ruDescription: string;
  private _enDescription: string;

  private _criteria: string;

  private _ruLocalizationTemplate: string;
  private _enLocalizationTemplate: string;

  private _localizationId: string;

  public static RU_LOCALIZATION_FILENAME = 'i18n_ru.yaml';
  public static EN_LOCALIZATION_FILENAME = 'i18n_en.yaml';

  public static LOCALIZATIONS_DIRNAME = 'i18n';
}
