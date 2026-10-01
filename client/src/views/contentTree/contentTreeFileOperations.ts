import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { Configuration } from '../../models/configuration';
import { ContentTreeBaseItem } from '../../models/content/contentTreeBaseItem';
import { ContentFolderType } from '../../models/content/contentFolder';
import { Correlation } from '../../models/content/correlation';
import { NameValidator } from '../../models/nameValidator';
import { XpException } from '../../models/xpException';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';

/**
 * Файловые операции над элементами дерева контента: перемещение, копирование и удаление.
 */
export class ContentTreeFileOperations {
  private static readonly ROOT_FOLDER_TYPES: string[] = [
    ContentFolderType.KbRoot,
    ContentFolderType.ContentRoot
  ];

  /**
   * Корень базы знаний и корни контента не перемещаются и не копируются.
   */
  public static isMovable(item: ContentTreeBaseItem): boolean {
    return !ContentTreeFileOperations.ROOT_FOLDER_TYPES.includes(item.contextValue);
  }

  /**
   * Директория, в которую вставляются элементы: сама директория или директория, в которой лежит правило.
   */
  public static getTargetDirectoryPath(target: ContentTreeBaseItem): string {
    return target.isFolder() ? target.getDirectoryPath() : target.getParentPath();
  }

  /**
   * Перемещает элементы в директорию. Открытые файлы перемещаемых элементов остаются открытыми.
   * @returns пути, затронутые перемещением.
   */
  public static async move(
    config: Configuration,
    items: ContentTreeBaseItem[],
    targetDirPath: string
  ): Promise<string[]> {
    const sources = ContentTreeFileOperations.getTopLevelItems(
      items.filter(ContentTreeFileOperations.isMovable)
    );

    const moves: [string, string][] = [];
    for (const item of sources) {
      const srcPath = item.getDirectoryPath();
      const dstPath = path.join(targetDirPath, path.basename(srcPath));
      if (dstPath === srcPath) {
        continue;
      }

      if (FileSystemHelper.isSubPath(targetDirPath, srcPath)) {
        throw new XpException(
          config.getMessage('View.ObjectTree.Message.CannotMoveIntoItself', item.getName())
        );
      }

      if (fs.existsSync(dstPath)) {
        throw new XpException(
          config.getMessage(
            'View.ObjectTree.Message.TargetAlreadyExists',
            path.basename(srcPath),
            path.basename(targetDirPath)
          )
        );
      }

      moves.push([srcPath, dstPath]);
    }

    for (const [srcPath, dstPath] of moves) {
      // Через WorkspaceEdit, чтобы открытые редакторы, в том числе с несохраненными изменениями,
      // переехали вместе с файлами.
      const edit = new vscode.WorkspaceEdit();
      edit.renameFile(vscode.Uri.file(srcPath), vscode.Uri.file(dstPath));
      if (!(await vscode.workspace.applyEdit(edit))) {
        await vscode.workspace.fs.rename(vscode.Uri.file(srcPath), vscode.Uri.file(dstPath));
      }
    }

    return moves.flat();
  }

  /**
   * Копирует элементы в директорию. При вставке одного элемента запрашивает имя копии.
   * Корреляции копируются с переименованием правила и новым ObjectId.
   * @returns пути созданных копий.
   */
  public static async copy(
    config: Configuration,
    items: ContentTreeBaseItem[],
    targetDirPath: string
  ): Promise<string[]> {
    const sources = ContentTreeFileOperations.getTopLevelItems(
      items.filter(ContentTreeFileOperations.isMovable)
    );

    const created: string[] = [];
    for (const item of sources) {
      const srcPath = item.getDirectoryPath();
      if (FileSystemHelper.isSubPath(targetDirPath, srcPath) && item.isFolder()) {
        throw new XpException(
          config.getMessage('View.ObjectTree.Message.CannotCopyIntoItself', item.getName())
        );
      }

      // Имена правил должны быть уникальны в базе знаний, поэтому копия правила всегда получает новое имя.
      let newName = ContentTreeFileOperations.getFreeName(
        targetDirPath,
        path.basename(srcPath),
        !item.isFolder()
      );
      if (sources.length === 1) {
        const userInput = await vscode.window.showInputBox({
          ignoreFocusOut: true,
          value: newName,
          prompt: config.getMessage(
            item.isFolder() ? 'NameOfNewFolder' : 'NameOfNewRule'
          ),
          validateInput: (name) =>
            ContentTreeFileOperations.validateName(config, item, name, targetDirPath)
        });

        if (!userInput) {
          return created;
        }
        newName = userInput.trim();
      }

      const dstPath = path.join(targetDirPath, newName);
      if (item instanceof Correlation) {
        const duplicate = await item.duplicate(newName, targetDirPath);
        await duplicate.save();
      } else {
        await vscode.workspace.fs.copy(vscode.Uri.file(srcPath), vscode.Uri.file(dstPath), {
          overwrite: false
        });
      }
      created.push(dstPath);
    }

    return created;
  }

  /**
   * Удаляет элементы в корзину после подтверждения пользователя.
   * @returns пути удаленных элементов.
   */
  public static async delete(
    config: Configuration,
    items: ContentTreeBaseItem[]
  ): Promise<string[]> {
    const targets = ContentTreeFileOperations.getTopLevelItems(
      items.filter((i) => i.contextValue !== ContentFolderType.KbRoot)
    );
    if (targets.length === 0) {
      return [];
    }

    const message =
      targets.length === 1
        ? config.getMessage('View.ObjectTree.Message.DeleteConfirmation', targets[0].getName())
        : config.getMessage('View.ObjectTree.Message.DeleteManyConfirmation', targets.length);
    const detail = targets.map((t) => t.getName()).join('\n');
    const moveToTrash = config.getMessage('View.ObjectTree.Message.MoveToTrash');
    const answer = await vscode.window.showWarningMessage(
      message,
      { modal: true, detail },
      moveToTrash
    );
    if (answer !== moveToTrash) {
      return [];
    }

    const deleted: string[] = [];
    for (const item of targets) {
      const uri = vscode.Uri.file(item.getDirectoryPath());
      try {
        await vscode.workspace.fs.delete(uri, { recursive: true, useTrash: true });
      } catch {
        const deletePermanently = config.getMessage('View.ObjectTree.Message.DeletePermanently');
        const permanentAnswer = await vscode.window.showWarningMessage(
          config.getMessage('View.ObjectTree.Message.MoveToTrashFailed', item.getName()),
          { modal: true },
          deletePermanently
        );
        if (permanentAnswer !== deletePermanently) {
          break;
        }
        await vscode.workspace.fs.delete(uri, { recursive: true, useTrash: false });
      }
      deleted.push(uri.fsPath);
    }

    return deleted;
  }

  private static validateName(
    config: Configuration,
    item: ContentTreeBaseItem,
    name: string,
    targetDirPath: string
  ): string | undefined {
    if (!item.isFolder()) {
      return NameValidator.validate(name, config, targetDirPath);
    }

    const trimmed = name.trim();
    if (trimmed === '') {
      return config.getMessage('EmptyName');
    }
    if (/[<>:"/\\|?*]/.test(trimmed)) {
      return config.getMessage('NameContainsInvalidCharacters');
    }
    if (fs.existsSync(path.join(targetDirPath, trimmed))) {
      return config.getMessage('AlreadyExists');
    }
  }

  private static getFreeName(targetDirPath: string, name: string, forceSuffix: boolean): string {
    if (!forceSuffix && !fs.existsSync(path.join(targetDirPath, name))) {
      return name;
    }

    for (let index = 1; ; index++) {
      const candidate = index === 1 ? `${name}_copy` : `${name}_copy${index}`;
      if (!fs.existsSync(path.join(targetDirPath, candidate))) {
        return candidate;
      }
    }
  }

  /**
   * Оставляет только элементы, которые не вложены в другие элементы из списка.
   */
  private static getTopLevelItems(items: ContentTreeBaseItem[]): ContentTreeBaseItem[] {
    const paths = items.map((i) => i.getDirectoryPath());
    return items.filter((item, index) =>
      paths.every(
        (p, otherIndex) =>
          otherIndex === index ||
          (p !== paths[index] && !FileSystemHelper.isSubPath(paths[index], p)) ||
          // Один и тот же элемент оставляем в единственном экземпляре.
          (p === paths[index] && otherIndex > index)
      )
    );
  }
}
