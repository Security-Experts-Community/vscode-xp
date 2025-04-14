import * as path from 'path';
import * as fs from 'fs';

import { RuleBaseItem } from './ruleBaseItem';
import { ContentTreeProvider } from '../../views/contentTree/contentTreeProvider';
import { BaseUnitTest } from '../tests/baseUnitTest';
import { UnitTestOutputParser } from '../tests/unitTestOutputParser';
import { UnitTestRunner } from '../tests/unitTestsRunner';
import { XpException } from '../xpException';
import { XPObjectType } from './xpObjectType';
import { ContentHelper } from '../../helpers/contentHelper';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { Localization } from './localization';
import { CorrelationUnitTest } from '../tests/correlationUnitTest';
import { IntegrationTest } from '../tests/integrationTest';
import { MetaInfo } from '../metaInfo/metaInfo';

export class Aggregation extends RuleBaseItem {
  protected getLocalizationPrefix(): string {
    return 'aggregation';
  }
  public clearUnitTests(): void {
    throw new XpException('Method not implemented.');
  }
  public getUnitTestRunner(): UnitTestRunner {
    throw new XpException('Method not implemented.');
  }
  public getUnitTestOutputParser(): UnitTestOutputParser {
    throw new XpException('Method not implemented.');
  }
  public reloadUnitTests(): void {
    throw new XpException('Method not implemented.');
  }
  public convertUnitTestFromObject(object: any): BaseUnitTest {
    throw new XpException('Method not implemented.');
  }
  public createNewUnitTest(): BaseUnitTest {
    throw new XpException('Method not implemented.');
  }
  public async rename(newRuleName: string): Promise<void> {
    // Старые значения.
    const oldRuleName = this.getName();

    // Переименовываем директорию с правилом
    const parentDirectoryPath = this.getParentPath();
    if (parentDirectoryPath && fs.existsSync(parentDirectoryPath)) {
      // Переименовываем в коде правила.
      const ruleCode = await this.getRuleCode();

      // Модифицируем код, если он есть
      if (ruleCode) {
        const newRuleCode = ContentHelper.replaceAllCorrelationNameWithinCode(
          newRuleName,
          ruleCode
        );
        await this.setRuleCode(newRuleCode, false);
      }
    }

    // В метаинформации.
    const metainfo = this.getMetaInfo();
    this.setName(newRuleName);
    metainfo.setName(newRuleName);

    // Замена в критериях.
    this.getMetaInfo()
      .getEventDescriptions()
      .forEach((ed) => {
        const criteria = ed.getCriteria();
        const newCriteria = ContentHelper.replaceAllRuleNamesWithinString(
          oldRuleName,
          newRuleName,
          criteria
        );
        ed.setCriteria(newCriteria);

        const localizationId = ed.getLocalizationId();
        const newLocalizationId = ContentHelper.replaceAllRuleNamesWithinString(
          oldRuleName,
          newRuleName,
          localizationId
        );
        ed.setLocalizationId(newLocalizationId);
      });

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
      const testExpectation = unitTest.getTestExpectation();
      const newTestExpectation = ContentHelper.replaceAllRuleNamesWithinString(
        oldRuleName,
        newRuleName,
        testExpectation
      );
      unitTest.setTestExpectation(newTestExpectation);

      const testInputData = unitTest.getTestInputData();
      const newTestInputData = ContentHelper.replaceAllRuleNamesWithinString(
        oldRuleName,
        newRuleName,
        testInputData
      );
      unitTest.setTestInputData(newTestInputData);
    });

    // Замена в правилах локализации
    this.getLocalizations().forEach((loc) => {
      const localizationId = loc.getLocalizationId();
      const newLocalizationId = ContentHelper.replaceAllRuleNamesWithinString(
        oldRuleName,
        newRuleName,
        localizationId
      );
      loc.setLocalizationId(newLocalizationId);
    });
  }

  private constructor(name: string, parentDirectoryPath?: string) {
    super(name, parentDirectoryPath);
    this.setFileName('rule.agr');
  }

  public getObjectType(): string {
    return XPObjectType.Aggregation;
  }

  public static async parseFromDirectory(
    directoryPath: string,
    fileName?: string
  ): Promise<Aggregation> {
    if (!fs.existsSync(directoryPath)) {
      throw new XpException(`Директория '${directoryPath}' не существует.`);
    }

    // Получаем имя корреляции и родительский путь.
    const name = path.basename(directoryPath);
    const parentDirectoryPath = path.dirname(directoryPath);

    const aggregation = new Aggregation(name, parentDirectoryPath);

    // Парсим основные метаданные.
    const metaInfo = await MetaInfo.fromFile(directoryPath);
    aggregation.setMetaInfo(metaInfo);

    const ruleFilePath = aggregation.getRuleFilePath();
    if (!fs.existsSync(ruleFilePath)) {
      throw new XpException(`Файл с кодом правила '${ruleFilePath}' не существует`);
    }

    // Если явно указано имя файла, то сохраняем его.
    // Иначе используем заданное в конструкторе
    if (fileName) {
      aggregation.setFileName(fileName);
    }

    // Добавляем команду на открытие.
    aggregation.setCommand({
      command: ContentTreeProvider.onRuleClickCommand,
      title: 'Open File',
      arguments: [aggregation]
    });

    const ruleCode = await FileSystemHelper.readContentFile(ruleFilePath);
    await aggregation.setRuleCode(ruleCode);

    // Парсим описания на разных языках.
    const ruDescription = await Localization.parseRuDescription(directoryPath);
    aggregation.setRuDescription(ruDescription);

    const enDescription = await Localization.parseEnDescription(directoryPath);
    aggregation.setEnDescription(enDescription);

    const localizations = await Localization.parseFromDirectory(directoryPath);
    if (!aggregation.checkLocalizationConsistency(localizations, aggregation.getMetaInfo())) {
      throw new XpException(
        `В правиле ${name} наборы идентификаторов локализаций (LocalizationId) в файлах метаинформации и локализаций не совпадают. Необходимо их скорректировать вручную и обновить дерево контента.`
      );
    }

    aggregation.setLocalizationTemplates(localizations);

    // const modularTests = CorrelationUnitTest.parseFromRuleDirectory(aggregation);
    // aggregation.addUnitTests(modularTests);

    const integrationTests = IntegrationTest.parseFromRuleDirectory(directoryPath);
    aggregation.addIntegrationTests(integrationTests);

    return aggregation;
  }

  public async save(parentFullPath?: string): Promise<void> {
    // Путь либо передан как параметр, либо он уже задан в правиле.
    let corrDirPath = '';
    if (parentFullPath) {
      corrDirPath = path.join(parentFullPath, this.name);
      this.setParentPath(parentFullPath);
    } else {
      const parentPath = this.getParentPath();
      if (!parentPath) {
        throw new XpException('Не задан путь для сохранения правила');
      }

      corrDirPath = this.getDirectoryPath();
    }

    if (!fs.existsSync(corrDirPath)) {
      await fs.promises.mkdir(corrDirPath, { recursive: true });
    }

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

  public static create(name: string, parentPath?: string, fileName?: string): Aggregation {
    const aggregation = new Aggregation(name, parentPath);

    // Если явно указано имя файла, то сохраняем его.
    // Иначе используем заданное в конструкторе
    if (fileName) {
      aggregation.setFileName(fileName);
    }

    // Добавляем команду на открытие.
    aggregation.setCommand({
      command: ContentTreeProvider.onRuleClickCommand,
      title: 'Open File',
      arguments: [aggregation]
    });

    return aggregation;
  }

  contextValue = 'Aggregation';
}
