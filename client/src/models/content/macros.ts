import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { ContentTreeProvider } from '../../views/contentTree/contentTreeProvider';
import { XpException } from '../xpException';
import { XPObjectType } from './xpObjectType';
import { FileSystemException } from '../fileSystemException';
import { RuleBaseItem } from './ruleBaseItem';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { BaseUnitTest } from '../tests/baseUnitTest';
import { UnitTestOutputParser } from '../tests/unitTestOutputParser';
import { UnitTestRunner } from '../tests/unitTestsRunner';
import { MetaInfo } from '../metaInfo/metaInfo';
import { YamlHelper } from '../../helpers/yamlHelper';

export class Macros extends RuleBaseItem {
  public async save(parentFullPath?: string): Promise<void> {
    // Путь либо передан как параметр, либо он уже задан в правиле.
    let marcoDirPath = '';
    if (parentFullPath) {
      marcoDirPath = path.join(parentFullPath, this.name);
      this.setParentPath(parentFullPath);
    } else {
      const parentPath = this.getParentPath();
      if (!parentPath) {
        throw new XpException('Не задан путь для сохранения макроса');
      }
      marcoDirPath = this.getDirectoryPath();
    }

    if (!fs.existsSync(marcoDirPath)) {
      await fs.promises.mkdir(marcoDirPath, { recursive: true });
    }

    const macrosFullPath = this.getRuleFilePath();
    const macrosCode = await this.getRuleCode();
    await FileSystemHelper.writeContentFile(macrosFullPath, macrosCode);

    // // Параллельно сохраняем все данные правила.
    let metaInfoFullPath = path.join(marcoDirPath, MetaInfo.METAINFO_FILENAME);
    await FileSystemHelper.writeContentFileIfChanged(
      metaInfoFullPath,
      await YamlHelper.stringify(this.metadata)
    );

    //await this.getMetaInfo().save(marcoDirPath);
  }

  public async saveMetaInfoAndLocalizations(): Promise<void> {
    const fullPath = this.getDirectoryPath();
    await this.getMetaInfo().save(fullPath);
  }

  public setRuDescription(description: string): void {
    this.getMetaInfo().setRuDescription(description);
  }

  public setEnDescription(description: string): void {
    this.getMetaInfo().setEnDescription(description);
  }

  public getRuDescription(): string {
    return this.getMetaInfo().getRuDescription();
  }

  public getEnDescription(): string {
    return this.getMetaInfo().getEnDescription();
  }

  public getObjectType(): string {
    return XPObjectType.Macro;
  }

  private constructor(name: string, parentDirectoryPath?: string) {
    super(name, parentDirectoryPath);
    this.setFileName('filter.flt');
  }

  public static async parseFromDirectory(
    directoryPath: string,
    fileName?: string
  ): Promise<Macros> {
    if (!fs.existsSync(directoryPath)) {
      throw new FileSystemException(`Директория '${directoryPath}' не существует`, directoryPath);
    }

    const name = path.basename(directoryPath);
    const parentDirectoryPath = path.dirname(directoryPath);
    const marcos = new Macros(name, parentDirectoryPath);

    // Если явно указано имя файла, то сохраняем его.
    // Иначе используем заданное в конструкторе
    if (fileName) {
      marcos.setFileName(fileName);
    }

    // Добавляем команду на открытие.
    marcos.setCommand({
      command: ContentTreeProvider.onRuleClickCommand,
      title: 'Open File',
      arguments: [marcos]
    });

    // Парсим основные метаданные.
    const metaInfo = await MetaInfo.fromFile(directoryPath);
    marcos.setMetaInfo(metaInfo);

    marcos.setRuDescription(metaInfo.getRuDescription());
    marcos.setEnDescription(metaInfo.getEnDescription());

    return marcos;
  }

  public static async create(name: string, parentDirectoryPath?: string): Promise<Macros> {
    const macros = new Macros(name, parentDirectoryPath);

    // Добавляем команду на открытие.
    macros.setCommand({
      command: ContentTreeProvider.onRuleClickCommand,
      title: 'Open File',
      arguments: [macros]
    });

    macros.setRuleCode(
      `filter ${name}(string $name) {
	filter::NotFromCorrelator()
	# and (
	# 	filter::ProcessStart_Windows($name)
	# 	or (
	# 		object == "process"
	# 		and action == "start"
	# 		and not in_list([
	# 			"windows",
	# 			"endpoint_monitor",
	# 			"sysmon"
	# 			], event_src.title)
	# 	)
	# )
	# and match(object.name, $name)
}`
    );

    // Метаданные по умолчанию.
    // const metaInfo = MetaInfo.create();

    // marco.setMetaInfo(metaInfo);
    // macros.metadata = metadata;
    return macros;
  }

  public getRuleFilePath(): string {
    return path.join(this.getDirectoryPath(), this.getFileName());
  }

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
  public rename(newName: string): Promise<void> {
    throw new XpException('Method not implemented.');
  }

  metadata = {
    Filter: {
      Name: {
        ru: '',
        en: ''
      },
      Description: {
        ru: '',
        en: ''
      },
      UseAsEventName: true
    }
    // Args: {},
    // Tags: []
  };
  iconPath = new vscode.ThemeIcon('filter');
  contextValue = 'Macros';
}
