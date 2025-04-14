import * as path from 'path';
import * as fs from 'fs';

import { RuleBaseItem } from './ruleBaseItem';
import { MetaInfo } from '../metaInfo/metaInfo';
import { CorrelationUnitTest } from '../tests/correlationUnitTest';
import { ContentTreeProvider } from '../../views/contentTree/contentTreeProvider';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { Configuration } from '../configuration';
import { IntegrationTest } from '../tests/integrationTest';
import { ContentHelper } from '../../helpers/contentHelper';
import { BaseUnitTest } from '../tests/baseUnitTest';
import { UnitTestRunner } from '../tests/unitTestsRunner';
import { UnitTestOutputParser } from '../tests/unitTestOutputParser';
import { CorrelationUnitTestOutputParser } from '../tests/correlationUnitTestOutputParser';
import { CorrelationUnitTestsRunner } from '../tests/correlationUnitTestsRunner';
import { Localization } from './localization';
import { XPObjectType } from './xpObjectType';

/**
 * Обогащение
 */
export class Enrichment extends RuleBaseItem {
  public clearUnitTests(): void {
    const testDirPath = this.getTestsPath();
    fs.readdirSync(testDirPath)
      .map((f) => path.join(testDirPath, f))
      .filter((f) => f.endsWith('.sc'))
      .forEach((f) => fs.unlinkSync(f));
  }

  public getUnitTestOutputParser(): UnitTestOutputParser {
    return new CorrelationUnitTestOutputParser();
  }

  public getUnitTestRunner(): UnitTestRunner {
    const outputParser = this.getUnitTestOutputParser();
    return new CorrelationUnitTestsRunner(Configuration.get(), outputParser);
  }
  public reloadUnitTests(): void {
    const unitTests = CorrelationUnitTest.parseFromRuleDirectory(this);
    this._unitTests = [];
    this.addUnitTests(unitTests);
  }
  public createNewUnitTest(): BaseUnitTest {
    return CorrelationUnitTest.create(this);
  }

  public convertUnitTestFromObject(object: any): CorrelationUnitTest {
    return Object.assign(CorrelationUnitTest.create(this), object) as CorrelationUnitTest;
  }

  protected getLocalizationPrefix(): string {
    return 'enrichment';
  }

  public async save(parentFullPath?: string): Promise<void> {
    // Путь либо передан как параметр, либо он уже задан в правиле.
    let corrDirPath = '';
    if (parentFullPath) {
      corrDirPath = path.join(parentFullPath, this.name);
      this.setParentPath(parentFullPath);
    } else {
      corrDirPath = this.getDirectoryPath();
    }

    if (!fs.existsSync(corrDirPath)) {
      await fs.promises.mkdir(corrDirPath, { recursive: true });
    }

    // Сохраняем код правила.
    const ruleFullPath = this.getRuleFilePath();
    const ruleCode = await this.getRuleCode();
    await FileSystemHelper.writeContentFile(ruleFullPath, ruleCode);

    // Параллельно сохраняем все данные правила.
    const metainfoPromise = this.getMetaInfo().save(corrDirPath);
    const localizationPromise = this.saveLocalization(corrDirPath);
    const integrationTestsPromise = this.saveIntegrationTests(corrDirPath);
    const unitTestsPromise = this.saveUnitTests();
    await Promise.all([
      metainfoPromise,
      localizationPromise,
      integrationTestsPromise,
      unitTestsPromise
    ]);
  }

  public async rename(newRuleName: string): Promise<void> {
    // Старые значения.
    const oldRuleName = this.getName();

    // Переименовываем директорию с правилом
    const parentDirectoryPath = this.getParentPath();

    let newRuleDirectoryPath: string;
    if (parentDirectoryPath && fs.existsSync(parentDirectoryPath)) {
      newRuleDirectoryPath = path.join(parentDirectoryPath, newRuleName);

      // Переименовываем в коде правила.
      const ruleCode = await this.getRuleCode();

      // Модифицируем код, если он есть
      if (ruleCode) {
        const newRuleCode = ContentHelper.replaceAllEnrichmentNameWithinCode(newRuleName, ruleCode);
        await this.setRuleCode(newRuleCode);
      }
    }

    // В метаинформации.
    const metainfo = this.getMetaInfo();
    metainfo.setName(newRuleName);

    // Замена в тестах.
    this.getIntegrationTests().forEach((integrationTest) => {
      const testCode = integrationTest.getTestCode();
      const newTestCode = ContentHelper.replaceAllRuleNamesWithinString(
        oldRuleName,
        newRuleName,
        testCode
      );
      integrationTest.setTestCode(newTestCode);
    });

    this.getUnitTests().forEach((unitTest) => {
      const testCode = unitTest.getTestExpectation();
      const newTestCode = ContentHelper.replaceAllRuleNamesWithinString(
        oldRuleName,
        newRuleName,
        testCode
      );
      unitTest.setTestExpectation(newTestCode);
    });

    // Имя правила.
    this.setName(newRuleName);
  }

  private constructor(name: string, parentDirectoryPath?: string) {
    super(name, parentDirectoryPath);
    this.setFileName('rule.en');
  }

  public getObjectType(): string {
    return XPObjectType.Enrichment;
  }

  public static create(name: string, parentPath?: string, fileName?: string): Enrichment {
    const rule = new Enrichment(name, parentPath);

    // Если явно указано имя файла, то сохраняем его.
    // Иначе используем заданное в конструкторе
    if (fileName) {
      rule.setFileName(fileName);
    }

    const metainfo = rule.getMetaInfo();
    metainfo.setName(name);

    const objectId = rule.generateObjectId();
    if (objectId) {
      metainfo.setObjectId(objectId);
    }

    // Добавляем команду на открытие.
    rule.setCommand({
      command: ContentTreeProvider.onRuleClickCommand,
      title: 'Open File',
      arguments: [rule]
    });

    return rule;
  }

  public static async parseFromDirectory(
    directoryPath: string,
    fileName?: string
  ): Promise<Enrichment> {
    // Получаем имя корреляции и родительский путь.
    const name = path.basename(directoryPath);
    const parentDirectoryPath = path.dirname(directoryPath);

    const enrichment = new Enrichment(name, parentDirectoryPath);

    // Если явно указано имя файла, то сохраняем его.
    // Иначе используем заданное в конструкторе
    if (fileName) {
      enrichment.setFileName(fileName);
    }

    // Парсим основные метаданные.
    const metaInfo = await MetaInfo.fromFile(directoryPath);
    enrichment.setMetaInfo(metaInfo);

    // Парсим описания на разных языках.
    const ruDescription = await Localization.parseRuDescription(directoryPath);
    enrichment.setRuDescription(ruDescription);

    const enDescription = await Localization.parseEnDescription(directoryPath);
    enrichment.setEnDescription(enDescription);

    const localizations = await Localization.parseFromDirectory(directoryPath);
    enrichment.setLocalizationTemplates(localizations);

    const modularTest = CorrelationUnitTest.parseFromRuleDirectory(enrichment);
    enrichment.addUnitTests(modularTest);

    const integrationTests = IntegrationTest.parseFromRuleDirectory(directoryPath);
    enrichment.addIntegrationTests(integrationTests);

    const localeDescription = enrichment.getLocaleDescription();
    enrichment.setTooltip(localeDescription);

    // Добавляем команду на открытие.
    enrichment.setCommand({
      command: ContentTreeProvider.onRuleClickCommand,
      title: 'Open File',
      arguments: [enrichment]
    });

    return enrichment;
  }

  contextValue = 'Enrichment';
}
