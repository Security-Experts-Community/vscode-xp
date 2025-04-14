import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

import { ContentTreeProvider } from '../../views/contentTree/contentTreeProvider';
import { XpException } from '../xpException';
import { XPObjectType } from './xpObjectType';
import { MetaInfo } from '../metaInfo/metaInfo';
import { Localization } from './localization';
import { RuleBaseItem } from './ruleBaseItem';
import { BaseUnitTest } from '../tests/baseUnitTest';
import { UnitTestOutputParser } from '../tests/unitTestOutputParser';
import { UnitTestRunner } from '../tests/unitTestsRunner';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { YamlHelper } from '../../helpers/yamlHelper';
import { TableView } from '../../views/tableListsEditor/commands/tableListCommandBase';
import { Configuration } from '../configuration';
import { KbHelper } from '../../helpers/kbHelper';

export enum TableListType {
  Registry = 'Registry',
  CorrelationRule = 'CorrelationRule',
  EnrichmentRule = 'EnrichmentRule',
  AssetGrid = 'AssetGrid'
}

export class Table extends RuleBaseItem {
  public convertUnitTestFromObject(object: any): BaseUnitTest {
    throw new Error('Method not implemented.');
  }
  public createNewUnitTest(): BaseUnitTest {
    throw new Error('Method not implemented.');
  }
  public clearUnitTests(): void {
    throw new Error('Method not implemented.');
  }
  public getUnitTestRunner(): UnitTestRunner {
    throw new Error('Method not implemented.');
  }
  public getUnitTestOutputParser(): UnitTestOutputParser {
    throw new Error('Method not implemented.');
  }
  protected getLocalizationPrefix(): string {
    throw new Error('Method not implemented.');
  }
  public reloadUnitTests(): void {
    throw new Error('Method not implemented.');
  }

  public async rename(newName: string): Promise<void> {
    throw new XpException('Method not implemented.');
  }

  /**
   * Возвращает код правила из файла с диска или из памяти.
   * @returns код правила.
   */
  public async getRuleCode(): Promise<string> {
    const rulePath = this.getRuleFilePath();

    // Порядок не такой как в других правилах, сохраненное состояние в памяти имеет приоритет при пересохранении ТС
    // TODO: нарушение инкапсуляции
    if (this._ruleCode) {
      return this._ruleCode;
    }

    if (fs.existsSync(rulePath)) {
      this._ruleCode = await fs.promises.readFile(rulePath, this.getRuleEncoding());
      return this._ruleCode;
    }

    return '';
  }

  public async save(parentFullPath?: string): Promise<void> {
    // Путь либо передан как параметр, либо он уже задан в правиле.
    let tableDirPath = '';
    if (parentFullPath) {
      tableDirPath = path.join(parentFullPath, this.name);
      this.setParentPath(parentFullPath);
    } else {
      const parentPath = this.getParentPath();
      if (!parentPath) {
        throw new XpException('Не задан путь для сохранения табличного списка');
      }

      tableDirPath = this.getDirectoryPath();
    }

    if (!fs.existsSync(tableDirPath)) {
      await fs.promises.mkdir(tableDirPath, { recursive: true });
    }

    const writeContentPromise = this.saveTableListStructure();
    const metainfoPromise = this.getMetaInfo().save(tableDirPath);
    const localizationPromise = this.saveLocalization(tableDirPath);
    await Promise.all([writeContentPromise, metainfoPromise, localizationPromise]);
  }

  public async saveTableListStructure(): Promise<void> {
    const ruleFullPath = this.getRuleFilePath();
    const tableList = await this.getRuleCode();

    const writeContentPromise = FileSystemHelper.writeContentFileIfChanged(ruleFullPath, tableList);
    return writeContentPromise;
  }

  public setTableType(type: TableListType): void {
    this._type = type;
  }

  public getTableType(): TableListType {
    return this._type;
  }

  constructor(name: string, type: TableListType, parentDirectoryPath?: string) {
    super(name, parentDirectoryPath);
    this.setFileName(Table.DEFAULT_TABLELIST_FILENAME);
    this.setTableType(type);
  }

  public getObjectType(): string {
    return XPObjectType.Table;
  }

  public static create(name: string, type: TableListType, parentPath?: string): Table {
    const table = new Table(name, type, parentPath);

    const metainfo = table.getMetaInfo();
    metainfo.setName(name);

    const objectId = table.generateObjectId();
    if (objectId) {
      metainfo.setObjectId(objectId);
    }

    // Добавляем команду на открытие.
    table.setCommand({
      command: ContentTreeProvider.onTableClickCommand,
      title: 'Open File',
      arguments: [table]
    });

    return table;
  }

  public generateObjectId(): string {
    const tableName = this.getName();
    const contentPrefix = Configuration.get().getContentPrefix();
    if (contentPrefix === '') {
      return undefined;
    }

    // Если у ТС изменился тип и он был установлен в PTKB, то ему нужно получить другой ID.
    const objectIdSeed = `${tableName}|${TableListType[this.getTableType()]}`;

    const objectType = this.getObjectType();
    return KbHelper.generateObjectId(objectIdSeed, contentPrefix, objectType);
  }

  public static async parseFromDirectory(directoryPath: string, fileName?: string): Promise<Table> {
    if (!fs.existsSync(directoryPath)) {
      throw new XpException(`Директория '${directoryPath}' не существует`);
    }

    // Получаем название табличного списка и родительский путь.
    const name = path.basename(directoryPath);
    const parentDirectoryPath = path.dirname(directoryPath);

    // Получаем тип табличного списка из файла
    let tableListFilePath: string;
    if (!fileName) {
      tableListFilePath = path.join(directoryPath, Table.DEFAULT_TABLELIST_FILENAME);
    } else {
      tableListFilePath = path.join(directoryPath, fileName);
    }

    const tableString = await FileSystemHelper.readContentFile(tableListFilePath);
    const tableObject = YamlHelper.parse(tableString) as TableView;
    if (!tableObject.fillType) {
      throw new XpException(`Не удалось определить тип табличного списка ${name}`);
    }

    const table = new Table(name, tableObject.fillType, parentDirectoryPath);

    // Если явно указано имя файла, то сохраняем его.
    // Иначе используем заданное в конструкторе
    if (fileName) {
      table.setFileName(fileName);
    }

    // Парсим основные метаданные.
    const metaInfo = await MetaInfo.fromFile(directoryPath);
    table.setMetaInfo(metaInfo);

    // Парсим описания на разных языках.
    // Русский
    const ruDescription = await Localization.parseRuDescription(directoryPath);
    table.setRuDescription(ruDescription);

    const ruWhitelistingDescriptions =
      await Localization.parseRuWhitelistingDescriptions(directoryPath);
    table.setRuWhitelistingDescriptions(ruWhitelistingDescriptions);

    // Английский
    const enDescription = await Localization.parseEnDescription(directoryPath);
    table.setEnDescription(enDescription);

    const enWhitelistingDescriptions =
      await Localization.parseEnWhitelistingDescriptions(directoryPath);
    table.setEnWhitelistingDescriptions(enWhitelistingDescriptions);

    const localeDescription = table.getLocaleDescription();
    table.setTooltip(localeDescription);

    // Добавляем команду на открытие.
    table.setCommand({
      command: ContentTreeProvider.onTableClickCommand,
      title: 'Open File',
      arguments: [table]
    });

    return table;
  }

  private _type: TableListType;

  iconPath = new vscode.ThemeIcon('symbol-number');
  contextValue = 'Table';

  public static DEFAULT_TABLELIST_FILENAME = 'table.tl';
}
