import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { PathLocator } from './pathLocator';
import { XpException } from '../xpException';
import { ArgumentException } from '../argumentException';

export class EDRPathHelper extends PathLocator {
  private constructor(kbFullPath: string) {
    super(kbFullPath);
  }

  private static _instance: EDRPathHelper;

  public static get(): EDRPathHelper {
    const kbFullPath =
      vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
        ? vscode.workspace.workspaceFolders[0].uri.fsPath
        : undefined;

    if (!EDRPathHelper._instance) {
      EDRPathHelper._instance = new EDRPathHelper(kbFullPath);
    }
    return EDRPathHelper._instance;
  }

  public getKbPath(): string {
    return this.getKbFullPath();
  }

  public getRootByPath(contentPath: string): string {
    if (!contentPath) {
      throw new ArgumentException(`Директория должна быть задана.`, 'contentPath');
    }

    const pathEntities = contentPath.split(path.sep);
    const roots = this.getContentRoots().map((folder) => {
      return path.basename(folder);
    });
    for (const root of roots) {
      const packagesDirectoryIndex = pathEntities.findIndex(
        (pe) => pe.toLocaleLowerCase() === root
      );
      if (packagesDirectoryIndex === -1) {
        continue;
      }

      // Удаляем лишние элементы пути и собираем результирующий путь.
      pathEntities.splice(packagesDirectoryIndex + 1);
      const packageDirectoryPath = pathEntities.join(path.sep);
      return packageDirectoryPath;
    }

    throw new XpException(
      `Путь к правилу ${contentPath} не содержит ни одну из корневых директорий: [${roots.join(', ')}]. Приведите структуру в соответствие ([пример](https://github.com/Security-Experts-Community/open-xp-rules)) и повторите`
    );
  }

  public getNormalizationsGraphFileName(): string {
    return 'formulas_graph.json';
  }

  public getEnrichmentsGraphFileName(): string {
    return 'enrules_graph.json';
  }

  public getCorrelationsGraphFileName(): string {
    return 'rules_graph.json';
  }

  public getAggregationsGraphFileName(): string {
    return 'aggrules_graph.json';
  }

  public getLocalizationsFolder(): string {
    return '';
  }

  // В корневой директории лежат пакеты экспертизы
  public getContentRoots(): string[] {
    this.checkKbPath();

    const basePath = path.join(this.getKbFullPath(), 'rules');

    let rootDirectories = [];
    if (fs.existsSync(basePath)) {
      rootDirectories = rootDirectories.concat(
        fs
          .readdirSync(basePath, { withFileTypes: true })
          .filter((dir) => dir.isDirectory())
          .map((dir) => path.join(basePath, dir.name))
      );
    }
    return rootDirectories;
  }

  public getPackages(): string[] {
    const contentRoots = this.getContentRoots();
    const packagesDirectories = [];

    for (const root of contentRoots) {
      packagesDirectories.concat(
        fs
          .readdirSync(root, { withFileTypes: true })
          .filter((dir) => dir.isDirectory())
          .map((dir) => dir.name)
      );
    }
    return packagesDirectories;
  }

  public getRulesDirFilters(): string {
    this.checkKbPath();
    const relative_path = path.join('common', 'rules_filters');
    return path.join(this.getKbFullPath(), relative_path);
  }

  public getRequiredRootDirectories(): string[] {
    return [
      path.join('resources', 'build-resources', 'common', 'rules_filters'),
      path.join('rules', 'windows'),
      path.join('rules', 'linux')
    ];
  }

  public isKbOpened(): boolean {
    const kbPath = EDRPathHelper.get();
    const requiredFolders = kbPath.getContentRoots();
    requiredFolders.concat(kbPath.getRulesDirFilters());
    for (const folder of requiredFolders) {
      if (!fs.existsSync(folder)) {
        return false;
      }
    }
    return true;
  }
}
