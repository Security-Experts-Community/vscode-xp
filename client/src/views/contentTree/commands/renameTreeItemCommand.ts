import * as path from 'path';
import * as vscode from 'vscode';

import { ContentTreeProvider } from '../contentTreeProvider';
import { ContentTreeFileOperations } from '../contentTreeFileOperations';
import { RuleBaseItem } from '../../../models/content/ruleBaseItem';
import { DialogHelper } from '../../../helpers/dialogHelper';
import { Configuration } from '../../../models/configuration';
import { ViewCommand } from '../../../models/command/command';
import { NameValidator } from '../../../models/nameValidator';

export class RenameTreeItemCommand extends ViewCommand {
  constructor(
    private config: Configuration,
    private selectedItem: RuleBaseItem
  ) {
    super();
  }

  public async execute(): Promise<void> {
    const ruleDirPath = this.selectedItem.getDirectoryPath();

    let stopExecution = false;
    vscode.workspace.textDocuments.forEach((td) => {
      const openFilePath = td.fileName;

      // Есть несохраненные пути в переименовываемом правиле.
      if (td.isDirty && openFilePath.includes(ruleDirPath)) {
        const fileName = path.basename(openFilePath);
        stopExecution = true;
        DialogHelper.showInfo(
          `Файл '${fileName}' не сохранен. Сохраните его и повторите действие.`
        );
      }
    });

    if (stopExecution) {
      return;
    }

    const oldRuleName = this.selectedItem.getName();
    const userInput = await vscode.window.showInputBox({
      ignoreFocusOut: true,
      value: oldRuleName,
      placeHolder: this.config.getMessage('NameOfNewRule'),
      prompt: this.config.getMessage('NameOfNewRule'),
      validateInput: (ruleName) => {
        // Регистр имени можно менять, остальные совпадения с соседними директориями запрещены.
        if (ruleName.trim().toLocaleLowerCase() === oldRuleName.toLocaleLowerCase()) {
          return;
        }
        return NameValidator.validate(ruleName, this.config, this.selectedItem.getParentPath());
      }
    });

    if (!userInput) {
      return;
    }

    try {
      const newRuleName = userInput.trim();
      if (this.selectedItem.isFolder()) {
        await this.selectedItem.rename(newRuleName);
        await this.selectedItem.save();
      } else {
        await this.renameRule(newRuleName);
      }

      // Обновить дерево и открыть корреляцию.
      await vscode.commands.executeCommand(ContentTreeProvider.refreshTreeCommand);
      await vscode.commands.executeCommand(
        ContentTreeProvider.onRuleClickCommand,
        this.selectedItem
      );
    } catch (error) {
      DialogHelper.showError('Не удалось переименовать объект', error);
      return;
    }
  }

  /**
   * Переносит директорию правила целиком, чтобы сохранить файлы, о которых модель правила не знает,
   * и открытые редакторы, после чего заменяет имя внутри файлов правила.
   */
  private async renameRule(newRuleName: string): Promise<void> {
    const oldRuleDirectoryPath = this.selectedItem.getDirectoryPath();
    const newRuleDirectoryPath = path.join(this.selectedItem.getParentPath(), newRuleName);

    // Читаем код правила, пока он лежит по старому пути: после переноса rename() возьмет его из памяти.
    await this.selectedItem.getRuleCode();

    await ContentTreeFileOperations.renamePath(oldRuleDirectoryPath, newRuleDirectoryPath);
    try {
      await this.selectedItem.rename(newRuleName);
    } catch (error) {
      await ContentTreeFileOperations.renamePath(newRuleDirectoryPath, oldRuleDirectoryPath);
      throw error;
    }

    await this.selectedItem.save();
  }
}
