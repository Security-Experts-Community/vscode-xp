import * as vscode from 'vscode';

import { Configuration } from '../configuration';
import { Command } from './command';
import { Log } from '../../extension';

/**
 * Возвращает настройки путей к KBT к состоянию «по умолчанию»: убирает записанные расширением
 * значения и сбрасывает запомненную версию KBT.
 *
 * Нужна тем, у кого в настройках уже лежат пути, записанные прежними версиями расширения:
 * такие значения неотличимы от заданных вручную и продолжают перекрывать вычисляемые пути.
 */
export class ResetKbtSettingsCommand extends Command {
  constructor(private config: Configuration) {
    super();
  }

  public async execute(): Promise<boolean> {
    // На macOS нативные LSP-сервер и форматтер включаются только явными путями, а legacy LSP
    // там отключён. Сброс этих путей оставил бы редактор без языкового сервера.
    const isLocalMacOS = this.config.isLocalMacOS();
    const confirmation = await vscode.window.showWarningMessage(
      this.config.getMessage(
        isLocalMacOS
          ? 'Command.ResetKbtSettings.Confirmation.MacOS'
          : 'Command.ResetKbtSettings.Confirmation'
      ),
      { modal: true },
      this.config.getMessage('Command.ResetKbtSettings.Confirm')
    );

    if (!confirmation) {
      return false;
    }

    const settingsToReset = ResetKbtSettingsCommand.RESETTABLE_SETTINGS.filter(
      (section) =>
        !isLocalMacOS || !ResetKbtSettingsCommand.MACOS_NATIVE_TOOL_SETTINGS.includes(section)
    );

    const configuration = this.config.getWorkspaceConfiguration();
    for (const section of settingsToReset) {
      for (const target of [
        vscode.ConfigurationTarget.WorkspaceFolder,
        vscode.ConfigurationTarget.Workspace,
        vscode.ConfigurationTarget.Global
      ]) {
        try {
          await configuration.update(section, undefined, target, false);
        } catch (error) {
          Log.warn(`Failed to reset the '${section}' setting: ${error.message}`);
        }
      }
    }

    await this.config.resetKbtCaches();
    await this.config.autoSelectKbtVersionIfNeeded();

    Log.info('KBT settings have been reset');
    await vscode.commands.executeCommand('workbench.action.reloadWindow');
    return true;
  }

  private static readonly RESETTABLE_SETTINGS = [
    'kbtBaseDirectory',
    'kbtVersionsDirectory',
    'lspServerExecutablePath',
    'formatterExecutablePath'
  ];

  private static readonly MACOS_NATIVE_TOOL_SETTINGS = [
    'kbtBaseDirectory',
    'lspServerExecutablePath',
    'formatterExecutablePath'
  ];
}
