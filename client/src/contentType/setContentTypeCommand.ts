import * as vscode from 'vscode';

import { Configuration } from '../models/configuration';
import { ContentType } from './contentType';

/**
 * Создаем элемент в строке состояния, который позволяет выбрать тип контента в открытой базе знаний, и позволяет его менять.
 */
export class SetContentTypeCommand {
  static Name = 'xpContentEditor.setContentType';

  static async init(config: Configuration): Promise<void> {
    const context = config.getContext();
    const setContentTypeCommand = new SetContentTypeCommand();

    // Значок на статус баре для смены типа контента.
    const contentTypeStatusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      10
    );
    contentTypeStatusBarItem.command = this.Name;
    context.subscriptions.push(contentTypeStatusBarItem);

    // Команда по смене.
    const command = vscode.commands.registerCommand(
      this.Name,
      async (newContentType?: ContentType) => {
        if (newContentType) {
          return await setContentTypeCommand.updateContentTypeStatusBarItem(
            contentTypeStatusBarItem,
            config,
            newContentType
          );
        }
        const selectedContentType = await vscode.window.showQuickPick(
          [ContentType.SIEM, ContentType.EDR],
          {
            placeHolder: config.getMessage('View.ObjectTree.Message.SelectTargetProduct')
          }
        );

        const contentTypeString = ContentType[selectedContentType];
        await setContentTypeCommand.updateContentTypeStatusBarItem(
          contentTypeStatusBarItem,
          config,
          contentTypeString
        );
      }
    );
    context.subscriptions.push(command);

    await setContentTypeCommand.updateContentTypeStatusBarItem(contentTypeStatusBarItem, config);
  }

  private async updateContentTypeStatusBarItem(
    item: vscode.StatusBarItem,
    config: Configuration,
    contentType?: ContentType
  ): Promise<void> {
    // Если значение не задано, то считываем из хранилища workspace.
    if (!contentType) {
      // Используем централизованный метод получения текущего типа контента
      contentType = config.getContentType();

      // При первом запуске выбираем SIEM.
      if (!contentType) {
        contentType = ContentType.SIEM;
      }
    }

    // Централизованно обновляем тип контента
    config.setContentType(contentType);

    item.text = config.getMessage('View.ObjectTree.Message.CurrentTargetProduct', contentType);
    // Подсказка при наведении.
    item.tooltip = config.getMessage('View.ObjectTree.Message.CurrentProductHoverMessage');
    item.show();
  }
}
