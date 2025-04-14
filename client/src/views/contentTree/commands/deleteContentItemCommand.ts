import * as vscode from 'vscode';
import * as fse from 'fs-extra';

import { DialogHelper } from '../../../helpers/dialogHelper';
import { RuleBaseItem } from '../../../models/content/ruleBaseItem';
import { ContentTreeProvider } from '../contentTreeProvider';
import { Configuration } from '../../../models/configuration';
import { ViewCommand } from '../../../models/command/command';

export class DeleteContentItemCommand extends ViewCommand {
  public constructor(
    private config: Configuration,
    private selectedItem: RuleBaseItem
  ) {
    super();
  }

  public async execute(): Promise<void> {
    const folderToDeletePath = this.selectedItem.getDirectoryPath();

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          cancellable: false,
          title: `Удаление`
        },
        async (progress) => {
          await fse.remove(folderToDeletePath);
        }
      );
    } catch (error) {
      DialogHelper.showError('Ошибка удаления файла', error);
    }

    await vscode.commands.executeCommand(ContentTreeProvider.refreshTreeCommand);
  }
}
