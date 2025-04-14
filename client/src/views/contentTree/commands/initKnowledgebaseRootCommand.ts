import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { Configuration } from '../../../models/configuration';
import { ContentTreeProvider } from '../contentTreeProvider';

/**
 * Создаем папки для формирования необходимой структуры корня базы знаний
 */
export class InitKBRootCommand {
  static Name = 'xpContentEditor.initKBRoot';

  static async init(config: Configuration): Promise<void> {
    const context = config.getContext();
    const command = vscode.commands.registerCommand(
      this.Name,
      async (config: Configuration, rootFolder: string) => {
        await this.execute(config, rootFolder);
      }
    );
    context.subscriptions.push(command);
  }

  static async execute(config: Configuration, rootFolder: string): Promise<void> {
    const requiredRootDirectories = config.getRequiredRootDirectories();
    for (const dir of requiredRootDirectories) {
      fs.promises.mkdir(path.join(rootFolder, dir), { recursive: true });
    }

    return ContentTreeProvider.refresh();
  }
}
