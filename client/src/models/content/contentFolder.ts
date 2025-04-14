import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as fse from 'fs-extra';

import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { ContentTreeBaseItem } from './contentTreeBaseItem';
import { XpException } from '../xpException';
import { MetaInfo } from '../metaInfo/metaInfo';

export enum ContentFolderType {
  KbRoot = 'KbRoot', // Корень открытой базы знаний
  ContentRoot = 'ContentRoot', // Директория с пакетами или пакеты под системы для EDR
  AuxiliaryFolder = 'AuxiliaryFolder', // Директории корня kb, в которых нет правил.
  PackageFolder = 'PackageFolder', // Директория пакета
  CorrelationsFolder = 'CorrelationsFolder', // Директория, с базовой директорией correlation_rules
  EnrichmentsFolder = 'EnrichmentsFolder', // Директория, с базовой директорией enrichment_rules
  AggregationsFolder = 'AggregationsFolder', // Директория, с базовой директорией aggregation_rules
  NormalizationsFolder = 'NormalizationsFolder', // Директория, с базовой директорией normalization_formulas
  TabularListsFolder = 'TabularListsFolder', // Директория, с базовой директорией tabular_lists
  AnotherFolder = 'AnotherFolder'
}

export class ContentFolder extends ContentTreeBaseItem {
  public getObjectType(): string {
    throw new Error('Method not implemented.');
  }

  public isFolder(): boolean {
    return true;
  }

  public async rename(newName: string): Promise<void> {
    this.oldName = this.getName();
    this.setName(newName);
  }

  public getRuleFileName(): string {
    throw new XpException('Method not implemented.');
  }

  public getRuleFilePath(): string {
    return this.getDirectoryPath();
  }

  public getDirectoryPath(): string {
    if (!this.getParentPath()) {
      throw new XpException(`Не задан путь к директории правила '${this.getName()}'.`);
    }

    return path.join(this.getParentPath(), this.getName());
  }

  public async save(fullPath?: string): Promise<void> {
    if (!this.oldName) {
      throw new XpException('Не задано новое имя директории');
    }

    const oldPath = path.join(this.getParentPath(), this.oldName);
    const newPath = path.join(this.getParentPath(), this.getName());
    await fse.move(oldPath, newPath, { overwrite: true });
    this.oldName = undefined;
  }

  constructor(directoryName: string, type: ContentFolderType, hasNestedElements: boolean) {
    super(directoryName, path.basename(directoryName));

    switch (type) {
      case ContentFolderType.PackageFolder:
        this.iconPath = new vscode.ThemeIcon('package');
        break;
      case ContentFolderType.ContentRoot:
        this.iconPath = new vscode.ThemeIcon('root-folder');
        break;
      default:
        this.iconPath = {
          light: path.join(this.getResourcesPath(), 'light', 'folder.svg'),
          dark: path.join(this.getResourcesPath(), 'dark', 'folder.svg')
        };
    }

    this.collapsibleState = hasNestedElements
      ? vscode.TreeItemCollapsibleState.Collapsed
      : vscode.TreeItemCollapsibleState.None;
  }

  public static async create(
    directoryPath: string,
    newFolderType: ContentFolderType
  ): Promise<ContentFolder> {
    if (!fs.existsSync(directoryPath)) {
      throw new XpException(`Директория '${directoryPath}' не существует.`);
    }

    const subDirectories = FileSystemHelper.readSubDirectoryNames(directoryPath);
    const name = path.basename(directoryPath);

    let contentFolder: ContentFolder;
    if (subDirectories.length > 0) {
      contentFolder = new ContentFolder(name, newFolderType, true);
    } else {
      contentFolder = new ContentFolder(name, newFolderType, false);
    }

    const parentPath = path.dirname(directoryPath);
    contentFolder.setParentPath(parentPath);

    // Парсим метаданные если это пакет
    const packageMetaInfoPath = path.join(directoryPath, ContentFolder.PACKAGE_METAINFO_DIRNAME);
    if (fs.existsSync(packageMetaInfoPath)) {
      const metaInfo = await MetaInfo.fromFile(packageMetaInfoPath);
      contentFolder.setMetaInfo(metaInfo);
    }

    // Задаем тип директории.
    contentFolder.contextValue = ContentFolderType[newFolderType];
    return contentFolder;
  }

  private oldName = undefined;

  public static PACKAGE_METAINFO_DIRNAME = '_meta';
}
