import * as vscode from 'vscode';

import { RuleBaseItem } from '../../../models/content/ruleBaseItem';
import { ContentTreeProvider } from '../contentTreeProvider';
import { Configuration } from '../../../models/configuration';
import { NameValidator } from '../../../models/nameValidator';
import { Macros } from '../../../models/content/macros';
import { ViewCommand } from '../../../models/command/command';

export class CreateMacroCommand extends ViewCommand {
  public constructor(
    private config: Configuration,
    private parentItem: RuleBaseItem
  ) {
    super();
  }

  public async execute(): Promise<void> {
    const userInput = await vscode.window.showInputBox({
      ignoreFocusOut: true,
      placeHolder: this.config.getMessage('MacrosName'),
      prompt: this.config.getMessage('MacrosName'),
      validateInput: (ruleName) => {
        return NameValidator.validate(ruleName, this.config, this.parentItem.getDirectoryPath());
      }
    });

    if (!userInput) {
      return;
    }

    const name = userInput.trim();
    const parentPath = this.parentItem.getDirectoryPath();
    const macros = await Macros.create(name, parentPath);

    const metainfo = macros.metadata;

    const objectId = macros.generateObjectId();
    if (objectId) {
      metainfo['ObjectId'] = objectId;
    }

    // Добавляем команду на открытие.
    macros.setCommand({
      command: ContentTreeProvider.onRuleClickCommand,
      title: 'Open File',
      arguments: [macros]
    });

    await macros.save();
    await ContentTreeProvider.refresh(this.parentItem);
    await ContentTreeProvider.selectItem(macros);
  }
}
