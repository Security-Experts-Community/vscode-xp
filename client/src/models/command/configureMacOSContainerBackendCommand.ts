import * as vscode from 'vscode';

import { MacOSContainerSetup } from '../../tools/macosContainerSetup';
import { Configuration } from '../configuration';
import { Command } from './command';

export class ConfigureMacOSContainerBackendCommand extends Command {
  constructor(private config: Configuration) {
    super();
  }

  public async execute(): Promise<boolean> {
    if (!this.config.isLocalMacOS()) {
      vscode.window.showInformationMessage(
        'XP container backend setup is intended for local macOS VS Code.'
      );
      return false;
    }

    await MacOSContainerSetup.configure(this.config);
    return true;
  }
}
