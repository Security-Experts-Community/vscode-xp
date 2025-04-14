import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { RuleBaseItem } from '../../../models/content/ruleBaseItem';
import { ContentTreeProvider } from '../contentTreeProvider';
import { Configuration } from '../../../models/configuration';
import { ViewCommand } from '../../../models/command/command';
import { NameValidator } from '../../../models/nameValidator';

export class CreateSubFolderCommand extends ViewCommand {
  public constructor(
    private config: Configuration,
    private selectedItem: RuleBaseItem
  ) {
    super();
  }

  public async execute(): Promise<void> {
    const userInput = await vscode.window.showInputBox({
      ignoreFocusOut: true,
      placeHolder: this.config.getMessage('NameOfNewFolder'),
      prompt: this.config.getMessage('NameOfNewFolder'),
      validateInput: (ruleName) => {
        return NameValidator.validate(ruleName, this.config, this.selectedItem.getDirectoryPath());
      }
    });

    if (!userInput) {
      return;
    }

    const newFolderName = userInput.trim();

    // Создаем директорию.
    const selectedItemDirPath = this.selectedItem.getDirectoryPath();
    const newFolderPath = path.join(selectedItemDirPath, newFolderName);
    fs.mkdirSync(newFolderPath, { recursive: true });

    await vscode.commands.executeCommand(ContentTreeProvider.refreshTreeCommand);
  }
}
