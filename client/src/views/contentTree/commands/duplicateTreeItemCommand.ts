import * as path from 'path';
import * as vscode from 'vscode';

import { ContentTreeProvider } from '../contentTreeProvider';
import { RuleBaseItem } from '../../../models/content/ruleBaseItem';
import { DialogHelper } from '../../../helpers/dialogHelper';
import { Configuration } from '../../../models/configuration';
import { ViewCommand } from '../../../models/command/command';
import { NameValidator } from '../../../models/nameValidator';

export class DuplicateTreeItemCommand extends ViewCommand {
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
        return NameValidator.validate(ruleName, this.config, this.selectedItem.getDirectoryPath());
      }
    });

    if (!userInput) {
      return;
    }

    try {
      const newRuleName = userInput.trim();
      const duplicate = await this.selectedItem.duplicate(newRuleName);
      await duplicate.save();

      // Обновить дерево и открыть корреляцию.
      vscode.commands.executeCommand(ContentTreeProvider.refreshTreeCommand);
      vscode.commands.executeCommand(ContentTreeProvider.onRuleClickCommand, duplicate);
    } catch (error) {
      DialogHelper.showInfo('Не удалось дублировать правило');
      return;
    }
  }
}
