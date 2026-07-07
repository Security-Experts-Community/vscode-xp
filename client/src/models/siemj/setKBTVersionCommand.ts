import * as vscode from 'vscode';
import * as fs from 'fs';

import { Configuration } from '../../models/configuration';
import { basename, join } from 'path';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { Log } from '../../extension';

/**
 * Создаем элемент в строке состояния, который позволяет выбрать тип контента в открытой базе знаний, и позволяет его менять.
 */
export class SetKBTVersionCommand {
  static Name = 'xpContentEditor.setKBTVersion';

  static async init(config: Configuration): Promise<void> {
    if (config.shouldUseDockerToolRunner()) {
      return;
    }

    const context = config.getContext();
    const setKBTVersionCommand = new SetKBTVersionCommand();

    // Значок на статус баре для смены типа контента.
    const kbtVersionStatusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      11
    );
    kbtVersionStatusBarItem.command = this.Name;
    context.subscriptions.push(kbtVersionStatusBarItem);

    // Команда по смене.
    const command = vscode.commands.registerCommand(this.Name, async (kbtVersion?: string) => {
      if (kbtVersion) {
        return await setKBTVersionCommand.updateKBTVersionStatusBarItem(
          kbtVersionStatusBarItem,
          config,
          kbtVersion
        );
      }

      const list = fs.readdirSync(config.getKbtVersionsDirectory());

      const kbtVersionsFolders = list.filter((folder) => folder.match(/kbt(:?\.\d)+/));

      const selectedKBTVersion = await vscode.window.showQuickPick(kbtVersionsFolders, {
        placeHolder: 'Select KBT version'
      });

      await setKBTVersionCommand.updateKBTVersionStatusBarItem(
        kbtVersionStatusBarItem,
        config,
        selectedKBTVersion
      );
    });
    context.subscriptions.push(command);

    await setKBTVersionCommand.updateKBTVersionStatusBarItem(kbtVersionStatusBarItem, config);
  }

  private async updateKBTVersionStatusBarItem(
    item: vscode.StatusBarItem,
    config: Configuration,
    kbtVersion?: string
  ): Promise<void> {
    // Если значение не задано, то считываем из хранилища workspace.
    if (!kbtVersion) {
      kbtVersion = config.getKbtVersion();
      if (!kbtVersion) {
        const kbtPath = config.getKbtBaseDirectoryOld();
        kbtVersion = basename(kbtPath);
      }
    }

    // Store the old version for comparison
    const oldKbtVersion = config.getKbtVersion();

    config.setKBTVersion(kbtVersion);
    Log.info(`Current KBT version: ${kbtVersion}`);

    // Update kbtBaseDirectory to point to the new version
    const kbtVersionsDirectory = config.getKbtVersionsDirectory();
    if (kbtVersionsDirectory) {
      const newKbtBaseDirectory = join(kbtVersionsDirectory, kbtVersion);
      try {
        // Only update if the directory exists
        if (fs.existsSync(newKbtBaseDirectory)) {
          const configuration = config.getWorkspaceConfiguration();
          configuration.update('kbtBaseDirectory', newKbtBaseDirectory, true, false);
          Log.info(`Updated kbtBaseDirectory to: ${newKbtBaseDirectory}`);
        }
      } catch (error) {
        Log.warn(`Failed to update kbtBaseDirectory: ${error.message}`);
      }
    }

    // Update lspServerExecutablePath to point to the new version
    try {
      // Use the resolved LSP path helper so an explicit setting or a discovered KBT path stay aligned.
      // This ensures consistency with the rest of the codebase
      const lspServerPath = config.getResolvedLSPServerExecutablePath();

      // Check if the path is valid and update the configuration
      const configuration = config.getWorkspaceConfiguration();
      if (lspServerPath && fs.existsSync(lspServerPath)) {
        configuration.update('lspServerExecutablePath', lspServerPath, true, false);
        Log.info(`Updated lspServerExecutablePath to: ${lspServerPath}`);
      } else {
        configuration.update('lspServerExecutablePath', '', true, false);
        Log.warn(`LSP server not found`);
      }
    } catch (error) {
      Log.warn(`Failed to update lspServerExecutablePath: ${error.message}`);
    }

    Log.debug('-= Updating LSP configuration =-');

    await config.updateLSPTaxonomyPath();
    Log.debug(`New LSP taxonomy path: ${config.getLSPTaxonomyPath()}`);

    await config.updateLSPi18nTaxonomyPath();
    Log.debug(`New LSP i18n taxonomy path: ${config.getLSPi18nTaxonomyPath()}`);

    const propertiesFile = join(config.getKbtBaseDirectory(), 'properties');

    if (fs.existsSync(propertiesFile)) {
      const kbtProperties = await FileSystemHelper.readContentFile(propertiesFile);
      if (kbtProperties) {
        Log.info(`Choosed KBT utilities versions:\n${kbtProperties.trim()}`);
      }
    }

    await config.setSIEMJVersion();

    item.text = kbtVersion;
    // Подсказка при наведении.
    item.tooltip = 'Choose KBT version from availible.';
    item.show();
  }
}
