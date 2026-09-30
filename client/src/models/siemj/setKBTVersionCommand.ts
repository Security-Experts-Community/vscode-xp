import * as vscode from 'vscode';
import * as fs from 'fs';

import { Configuration } from '../../models/configuration';
import { join } from 'path';
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

      if (!selectedKBTVersion) {
        return;
      }

      await setKBTVersionCommand.updateKBTVersionStatusBarItem(
        kbtVersionStatusBarItem,
        config,
        selectedKBTVersion
      );
    });
    context.subscriptions.push(command);

    await setKBTVersionCommand.updateKBTVersionStatusBarItem(kbtVersionStatusBarItem, config);
  }

  /**
   * @param kbtVersion версия, выбранная пользователем. Если её нет, то версия определяется по
   * настройкам и запомненному состоянию, а сами настройки не переписываются: иначе выбранный
   * вручную путь к KBT затирался бы при каждой активации расширения.
   */
  private async updateKBTVersionStatusBarItem(
    item: vscode.StatusBarItem,
    config: Configuration,
    kbtVersion?: string
  ): Promise<void> {
    const isExplicitlySelected = !!kbtVersion;
    if (!kbtVersion) {
      kbtVersion = config.resolveKbtVersion();
      if (!kbtVersion) {
        Log.warn('Failed to determine the KBT version, the status bar item is hidden');
        item.hide();
        return;
      }
    }

    // Все обновления состояния и настроек ждём: иначе следующие шаги (в том числе определение
    // версии SIEMJ) читают пути ещё от предыдущей версии KBT.
    await config.setKBTVersion(kbtVersion);
    Log.info(`Current KBT version: ${kbtVersion}`);

    if (isExplicitlySelected) {
      await SetKBTVersionCommand.updateKbtBaseDirectorySetting(config, kbtVersion);
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

    try {
      await config.setSIEMJVersion();
    } catch (error) {
      // Версия определится повторно и по требованию, ронять из-за этого выбор версии KBT незачем.
      Log.warn(`Failed to determine SIEMJ version: ${error.message}`);
    }

    item.text = kbtVersion;
    // Подсказка при наведении.
    item.tooltip = 'Choose KBT version from availible.';
    item.show();
  }

  /**
   * Перенацеливает на выбранную версию настройки, которые пользователь задал явно. Настройки,
   * которых у пользователя нет, не создаются: пути к KBT вычисляются от выбранной версии,
   * а записанное значение затем указывало бы на прежнюю поставку.
   */
  private static async updateKbtBaseDirectorySetting(
    config: Configuration,
    kbtVersion: string
  ): Promise<void> {
    const kbtVersionsDirectory = config.getKbtVersionsDirectory();
    if (!kbtVersionsDirectory) {
      return;
    }

    const newKbtBaseDirectory = join(kbtVersionsDirectory, kbtVersion);
    if (!fs.existsSync(newKbtBaseDirectory)) {
      return;
    }

    try {
      if (await config.updateExplicitSetting('kbtBaseDirectory', newKbtBaseDirectory)) {
        Log.info(`Updated kbtBaseDirectory to: ${newKbtBaseDirectory}`);
      }
    } catch (error) {
      Log.warn(`Failed to update kbtBaseDirectory: ${error.message}`);
    }

    try {
      const lspServerPath = config.getResolvedLSPServerExecutablePath();
      if (
        lspServerPath &&
        (await config.updateExplicitSetting('lspServerExecutablePath', lspServerPath))
      ) {
        Log.info(`Updated lspServerExecutablePath to: ${lspServerPath}`);
      }
    } catch (error) {
      Log.warn(`Failed to update lspServerExecutablePath: ${error.message}`);
    }
  }
}
