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

    config.setKBTVersion(kbtVersion);
    Log.info(`Current KBT version: ${kbtVersion}`);

    Log.debug('-= Updating LSP configuration =-');

    const currentLSPTaxonomyPath = config.getLSPTaxonomyPath();
    Log.debug(`Current LSP taxonomy path: ${currentLSPTaxonomyPath}`);
    if (config.craftLSPTaxonomyPath() === currentLSPTaxonomyPath) {
      await config.updateLSPTaxonomyPath();
      Log.debug(`New LSP taxonomy path: ${config.getLSPTaxonomyPath()}`);
    }

    const currentLSPi18nTaxonomyPath = config.getLSPi18nTaxonomyPath();
    Log.debug(`Current LSP i18n taxonomy path: ${currentLSPi18nTaxonomyPath}`);
    if (config.craftLSPi18nTaxonomyPath() === currentLSPi18nTaxonomyPath) {
      await config.updateLSPi18nTaxonomyPath();
      Log.debug(`New LSP i18n taxonomy path: ${config.getLSPi18nTaxonomyPath()}`);
    }

    const propertiesFile = join(config.getKbtBaseDirectory(), 'properties');

    if (fs.existsSync(propertiesFile)) {
      const kbtProperties = await FileSystemHelper.readContentFile(propertiesFile);
      if (kbtProperties) {
        Log.info(`Choosed KBT utilities versions:\n${kbtProperties.trim()}`);
      }
    }

    item.text = kbtVersion;
    // Подсказка при наведении.
    item.tooltip = 'Choose KBT version from availible.';
    item.show();
  }
}
