import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { PathLocator } from './pathLocator';
import { XpException } from '../xpException';

export class SIEMPathHelper extends PathLocator {
  private constructor(kbFullPath: string) {
    super(kbFullPath);
  }

  private static _instance: SIEMPathHelper;

  public static get(): SIEMPathHelper {
    const kbFullPath =
      vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
        ? vscode.workspace.workspaceFolders[0].uri.fsPath
        : undefined;

    if (!SIEMPathHelper._instance) {
      SIEMPathHelper._instance = new SIEMPathHelper(kbFullPath);
    }
    return SIEMPathHelper._instance;
  }

  public getKbPath(): string {
    return this.getKbFullPath();
  }

  public getOutputDirectoryPath(): string {
    return path.join(this.getKbFullPath(), 'packages');
  }

  public getRootByPath(directory: string): string {
    if (!directory) {
      return '';
    }

    const pathEntities = directory.split(path.sep);
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
      `Путь к правилу ${directory} не содержит ни одну из корневых директорий: [${roots.join(', ')}]. Приведите структуру в соответствие ([пример](https://github.com/Security-Experts-Community/open-xp-rules)) и повторите`
    );
  }

  public getNormalizationsGraphFileName(): string {
    return 'formulas_graph.json';
  }

  public getEnrichmentsGraphFileName(): string {
    return 'enrules_graph.json';
  }

  public getCorrelationsGraphFileName(): string {
    return 'corrules_graph.json';
  }

  public getAggregationsGraphFileName(): string {
    return 'aggfilters.json';
  }

  public getLocalizationsFolder(): string {
    return 'langs';
  }

  // В корневой директории лежат пакеты экспертизы
  public getContentRoots(): string[] {
    this.checkKbPath();
    return [path.join(this.getKbFullPath(), 'packages')];
  }

  public getPackages(): string[] {
    const contentRoots = this.getContentRoots();
    let packagesDirectories = [];
    for (const root of contentRoots) {
      packagesDirectories = packagesDirectories.concat(
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
    return [path.join('common', 'rules_filters'), 'packages'];
  }

  public isKbOpened(): boolean {
    const kbPath = SIEMPathHelper.get();
    const requredFolders = kbPath.getContentRoots();
    requredFolders.concat(kbPath.getRulesDirFilters());

    for (const folder of requredFolders) {
      if (!fs.existsSync(folder)) {
        return false;
      }
    }
    return true;
  }
}
