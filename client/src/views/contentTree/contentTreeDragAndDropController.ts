import * as path from 'path';
import * as vscode from 'vscode';

import { Configuration } from '../../models/configuration';
import { ContentTreeBaseItem } from '../../models/content/contentTreeBaseItem';
import { ExceptionHelper } from '../../helpers/exceptionHelper';
import { ContentTreeFileOperations } from './contentTreeFileOperations';

/**
 * Перемещение элементов дерева контента перетаскиванием.
 */
export class ContentTreeDragAndDropController
  implements vscode.TreeDragAndDropController<ContentTreeBaseItem>
{
  // Формат mime-типа для дерева задан VS Code: application/vnd.code.tree.<идентификатор дерева в нижнем регистре>.
  private static readonly TREE_MIME_TYPE = 'application/vnd.code.tree.knowledgebasetree';

  public readonly dragMimeTypes = ['text/uri-list'];
  public readonly dropMimeTypes = [ContentTreeDragAndDropController.TREE_MIME_TYPE];

  constructor(
    private config: Configuration,
    private onItemsMoved: (paths: string[]) => void
  ) {}

  public handleDrag(source: readonly ContentTreeBaseItem[], dataTransfer: vscode.DataTransfer): void {
    const items = source.filter(ContentTreeFileOperations.isMovable);
    if (items.length === 0) {
      return;
    }

    dataTransfer.set(ContentTreeDragAndDropController.TREE_MIME_TYPE, new vscode.DataTransferItem(items));

    // Позволяет открыть правило, перетащив его в область редактора.
    const uris = items.map((i) => vscode.Uri.file(i.getFilePath() ?? i.getDirectoryPath()).toString());
    dataTransfer.set('text/uri-list', new vscode.DataTransferItem(uris.join('\r\n')));
  }

  public async handleDrop(
    target: ContentTreeBaseItem | undefined,
    dataTransfer: vscode.DataTransfer
  ): Promise<void> {
    const transferItem = dataTransfer.get(ContentTreeDragAndDropController.TREE_MIME_TYPE);
    if (!target || !transferItem) {
      return;
    }

    const items = transferItem.value as ContentTreeBaseItem[];
    const targetDirPath = ContentTreeFileOperations.getTargetDirectoryPath(target);
    if (items.every((i) => path.dirname(i.getDirectoryPath()) === targetDirPath)) {
      return;
    }

    const message =
      items.length === 1
        ? this.config.getMessage(
            'View.ObjectTree.Message.MoveConfirmation',
            items[0].getName(),
            path.basename(targetDirPath)
          )
        : this.config.getMessage(
            'View.ObjectTree.Message.MoveManyConfirmation',
            items.length,
            path.basename(targetDirPath)
          );
    const move = this.config.getMessage('View.ObjectTree.Message.Move');
    const answer = await vscode.window.showWarningMessage(message, { modal: true }, move);
    if (answer !== move) {
      return;
    }

    try {
      const movedPaths = await ContentTreeFileOperations.move(this.config, items, targetDirPath);
      this.onItemsMoved([...movedPaths, targetDirPath]);
    } catch (error) {
      ExceptionHelper.show(error, this.config.getMessage('View.ObjectTree.Message.MoveFailed'));
    }
  }
}
