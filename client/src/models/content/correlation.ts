import * as path from 'path';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as vscode from 'vscode';

import { MetaInfo } from '../metaInfo/metaInfo';
import { Localization } from './localization';
import { IntegrationTest } from '../tests/integrationTest';
import { RuleBaseItem } from './ruleBaseItem';
import { CorrelationUnitTest } from '../tests/correlationUnitTest';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { ContentTreeProvider } from '../../views/contentTree/contentTreeProvider';
import { KbHelper } from '../../helpers/kbHelper';
import { Configuration } from '../configuration';
import { ContentHelper } from '../../helpers/contentHelper';
import { BaseUnitTest } from '../tests/baseUnitTest';
import { UnitTestRunner } from '../tests/unitTestsRunner';
import { CorrelationUnitTestsRunner } from '../tests/correlationUnitTestsRunner';
import { UnitTestOutputParser } from '../tests/unitTestOutputParser';
import { CorrelationUnitTestOutputParser } from '../tests/correlationUnitTestOutputParser';
import { XpException } from '../xpException';
import { UnitTestContentEditorViewProvider } from '../../views/unitTestEditor/unitTestEditorViewProvider';
import { MetaInfoEventDescription } from '../metaInfo/metaInfoEventDescription';
import { XPObjectType } from './xpObjectType';
import { FileSystemException } from '../fileSystemException';
import { ParserHelper } from '../../helpers/parserHelper';

export class CorrelationEvent {
  correlation_name: string;
  correlation_type: string;
}

export class Correlation extends RuleBaseItem {
  protected getLocalizationPrefix(): string {
    return 'corrname';
  }
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

  constructor(name: string, parentDirectoryPath?: string) {
    super(name, parentDirectoryPath);
    this.setFileName('rule.co');
  }

  public static async parseFromDirectory(
    directoryPath: string,
    fileName?: string
  ): Promise<Correlation> {
    if (!fs.existsSync(directoryPath)) {
      throw new FileSystemException(`Директория '${directoryPath}' не существует.`);
    }

    // Получаем имя корреляции и родительский путь.
    const correlationName = path.basename(directoryPath);
    const parentDirectoryPath = path.dirname(directoryPath);
    const correlation = new Correlation(correlationName, parentDirectoryPath);

    // Если явно указано имя файла, то сохраняем его.
    // Иначе используем заданное в конструкторе
    if (fileName) {
      correlation.setFileName(fileName);
    }

    // Парсим основные метаданные.
    const metaInfo = await MetaInfo.fromFile(directoryPath);
    correlation.setMetaInfo(metaInfo);

    const ruleFilePath = correlation.getRuleFilePath();
    if (!fs.existsSync(ruleFilePath)) {
      throw new XpException(`Файл с кодом правила '${ruleFilePath}' не существует`);
    }

    const ruleCode = await FileSystemHelper.readContentFile(ruleFilePath);
    await correlation.setRuleCode(ruleCode);

    // Если из кода удалось извлечь имя правила, то именно оно будет использоваться в дереве объектов
    if (ruleCode) {
      const ruleName = ParserHelper.parseRuleName(ruleCode);
      if (ruleName) {
        correlation.setName(ruleName);
      }
    }

    // Парсим описания на разных языках.
    const ruDescription = await Localization.parseRuDescription(directoryPath);
    correlation.setRuDescription(ruDescription);

    const enDescription = await Localization.parseEnDescription(directoryPath);
    correlation.setEnDescription(enDescription);

    const localizations = await Localization.parseFromDirectory(directoryPath);
    if (!correlation.checkLocalizationConsistency(localizations, correlation.getMetaInfo())) {
      throw new XpException(
        `В правиле ${correlationName} наборы идентификаторов локализаций (LocalizationId) в файлах метаинформации и локализаций не совпадают. Необходимо их скорректировать вручную и обновить дерево контента.`
      );
    }

    correlation.setLocalizationTemplates(localizations);

    const modularTests = CorrelationUnitTest.parseFromRuleDirectory(correlation);
    correlation.addUnitTests(modularTests);

    const integrationTests = IntegrationTest.parseFromRuleDirectory(directoryPath);
    correlation.addIntegrationTests(integrationTests);

    const localeDescription = correlation.getLocaleDescription();
    correlation.setTooltip(localeDescription);

    // Добавляем команду на открытие.
    correlation.setCommand({
      command: ContentTreeProvider.onRuleClickCommand,
      title: 'Open File',
      arguments: [correlation]
    });

    return correlation;
  }

  public async duplicate(newName: string, newParentPath?: string): Promise<RuleBaseItem> {
    // Дублируем правило без цикличных зависимостей
    const copy: Correlation = JSON.parse(
      JSON.stringify(this, (key, value) => {
        const filterList = ['_rule', 'command'];
        return filterList.indexOf(key) === -1 ? value : undefined;
      })
    );

    const duplicatedRule = Object.assign(Correlation.create(newName), copy) as Correlation;

    duplicatedRule.setCommand({
      command: ContentTreeProvider.onRuleClickCommand,
      title: 'Open File',
      arguments: [duplicatedRule]
    });

    duplicatedRule.getRuleFilePath();

    // Если задан новый родительский каталог, то обновляем соответствующий параметр
    if (!newParentPath) {
      duplicatedRule.setParentPath(this.getParentPath());
    } else {
      duplicatedRule.setParentPath(newParentPath);
    }

    // Каждый тест связываем с новым правилом и задаем команду на открытие
    const unitTests = duplicatedRule.getUnitTests();
    const fixedUnitTests = unitTests.map((test): BaseUnitTest => {
      const fixedTest = Object.assign(
        CorrelationUnitTest.create(duplicatedRule),
        test
      ) as CorrelationUnitTest;
      fixedTest.setRule(duplicatedRule);
      fixedTest.setCommand({
        command: UnitTestContentEditorViewProvider.onTestSelectionChangeCommand,
        title: 'Open File',
        arguments: [fixedTest]
      });
      return fixedTest;
    });
    duplicatedRule.setUnitTests(fixedUnitTests);

    const integrationTests = duplicatedRule.getIntegrationTests();
    const fixedIntegrationTests = integrationTests.map((test): IntegrationTest => {
      const fixedTest = Object.assign(
        IntegrationTest.create(1, duplicatedRule.getDirectoryPath()),
        test
      ) as IntegrationTest;
      return fixedTest;
    });
    duplicatedRule.setIntegrationTests(fixedIntegrationTests);

    const fixedMetainfo = Object.assign(
      MetaInfo.create(duplicatedRule),
      duplicatedRule.getMetaInfo()
    ) as MetaInfo;
    // Обновление ObjectId
    fixedMetainfo.setObjectId(duplicatedRule.generateObjectId());

    const fixedCreatedDate = Object.assign(new Date(), fixedMetainfo.getCreatedDate()) as Date;
    fixedMetainfo.setCreatedDate(fixedCreatedDate);
    const fixedUpdatedDate = Object.assign(new Date(), fixedMetainfo.getUpdatedDate()) as Date;
    fixedMetainfo.setUpdatedDate(fixedUpdatedDate);

    const eventDescriptions = fixedMetainfo.getEventDescriptions();
    const fixedEventDescriptions = eventDescriptions.map((ed): MetaInfoEventDescription => {
      const fixedED = Object.assign(new MetaInfoEventDescription(), ed) as MetaInfoEventDescription;
      return fixedED;
    });
    fixedMetainfo.setEventDescriptions(fixedEventDescriptions);
    duplicatedRule.setMetaInfo(fixedMetainfo);

    const localizations = duplicatedRule.getLocalizations();
    const fixedLocalizations = localizations.map((loc): Localization => {
      const fixedLocalization = Object.assign(Localization.create('', '', ''), loc) as Localization;
      return fixedLocalization;
    });
    duplicatedRule.setLocalizationTemplates(fixedLocalizations);

    await duplicatedRule.rename(newName);
    return duplicatedRule;
  }

  public static create(name: string, parentPath?: string, fileName?: string): Correlation {
    const rule = new Correlation(name, parentPath);

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

  public getObjectType(): string {
    return XPObjectType.Correlation;
  }

  /**
   * Копирует правило без изменений по новому пути.
   * @param dstDirectory путь по которому будет скопировано правило.
   * @returns скопированная корреляция
   */
  public async copy(dstDirectory: string): Promise<Correlation> {
    const ruleDirectory = this.getDirectoryPath();
    const ruleName = this.getName();

    // Копируем в новую директорию.
    const newRuleDirPath = path.join(dstDirectory, ruleName);
    await fs.promises.mkdir(newRuleDirPath, { recursive: true });
    await fse.copy(ruleDirectory, newRuleDirPath, { recursive: true });

    // Возвращаем скопированную корреляцию.
    const copiedCorrelation = await Correlation.parseFromDirectory(newRuleDirPath);
    return copiedCorrelation;
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
        throw new XpException('Не задан путь для сохранения корреляции');
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

  contextValue = 'Correlation';
}
