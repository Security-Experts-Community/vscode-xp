import * as fs from 'fs';
import * as vscode from 'vscode';

import { VsCodeApiHelper } from '../../../helpers/vsCodeApiHelper';
import { ViewCommand } from '../../../models/command/command';
import { Configuration } from '../../../models/configuration';

export class OpenKnowledgebaseCommand extends ViewCommand {
  constructor(private config: Configuration) {
    super();
  }

  public async execute(): Promise<void> {
    const showOpenDialogUris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      canSelectFolders: true
    });

    if (!showOpenDialogUris || showOpenDialogUris.length != 1) {
      return;
    }

    const openKnowledgebaseDirectoryPath = showOpenDialogUris[0].fsPath;

    // Проверка доступности директории.
    if (!fs.existsSync(openKnowledgebaseDirectoryPath)) {
      vscode.window.showErrorMessage(
        `Папка '${openKnowledgebaseDirectoryPath}' недоступна. Выберите другую папку.`
      );
      return;
    }

    // Открываем базу знаний.
    VsCodeApiHelper.openFolder(openKnowledgebaseDirectoryPath);
  }
}
