import * as vscode from 'vscode';

import { ConfigureMacOSContainerBackendCommand } from './configureMacOSContainerBackendCommand';
import { Configuration } from '../configuration';
import { ShowExtensionOutputChannelCommand } from './showExtensionOutputChannelCommand';
import { ShowExtensionSettingsCommand } from './showExtensionSettingsCommand';

export class CommonCommands {
  public static init(config: Configuration): void {
    config.getContext().subscriptions.push(
      vscode.commands.registerCommand(CommonCommands.SHOW_OUTPUT_CHANNEL_COMMAND, async () => {
        const command = new ShowExtensionOutputChannelCommand(config);
        command.execute();
      })
    );

    config.getContext().subscriptions.push(
      vscode.commands.registerCommand(CommonCommands.SHOW_EXTENSION_SETTINGS_COMMAND, async () => {
        const command = new ShowExtensionSettingsCommand(config);
        command.execute();
      })
    );

    config.getContext().subscriptions.push(
      vscode.commands.registerCommand(
        CommonCommands.CONFIGURE_MACOS_CONTAINER_BACKEND_COMMAND,
        async () => {
          const command = new ConfigureMacOSContainerBackendCommand(config);
          command.execute();
        }
      )
    );
  }

  public static SHOW_OUTPUT_CHANNEL_COMMAND = 'xp.commonCommands.showOutputChannel';
  public static SHOW_EXTENSION_SETTINGS_COMMAND = 'xp.commonCommands.showExtensionSettings';
  public static CONFIGURE_MACOS_CONTAINER_BACKEND_COMMAND =
    'xp.commonCommands.configureMacOSContainerBackend';
}
