import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { DialogHelper } from '../../../helpers/dialogHelper';
import { ProcessHelper } from '../../../helpers/processHelper';
import { Configuration } from '../../../models/configuration';
import { RuleBaseItem } from '../../../models/content/ruleBaseItem';
import { PackAction } from './packAction';
import { XpException } from '../../../models/xpException';
import { FileSystemException } from '../../../models/fileSystemException';
import { MetaInfo } from '../../../models/metaInfo/metaInfo';

export class PackEDRPackageAction {
  constructor(private config: Configuration) {}

  public async run(selectedPackage: RuleBaseItem): Promise<void> {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: true
      },
      async (progress) => {
        const outputChannel = this.config.getOutputChannel();
        outputChannel.clear();
        outputChannel.show();
        const packageName = selectedPackage.getName();
        const rootFolder = path.basename(selectedPackage.getContentRootPath(this.config));

        // Выводим описание задачи.
        progress.report({ message: `Сборка пакета '${packageName}'` });
        try {
          outputChannel.appendLine('----------------------------------------');
          outputChannel.appendLine(`XP :: Packing ${packageName} package...`);
          outputChannel.appendLine('----------------------------------------');

          /** Выбираем директорию с модулем коррелятора.
           *  Пример:
           *    c:\tmp\edr-xp-rules-main\resources\correlator\1.0.0\cmodule\data\graphs.zip
           */
          const graphsDirectories = await vscode.window.showOpenDialog({
            title: 'Укажите путь к файлу graphs.zip',
            canSelectMany: false,
            canSelectFolders: false,
            canSelectFiles: true,
            openLabel: 'Выбрать этот graphs.zip',
            filters: { 'graphs.zip (*.zip)': ['zip'] },
            defaultUri: vscode.Uri.file(packageName)
          });

          let expectedFolder = '';
          switch (rootFolder) {
            case 'windows':
              expectedFolder = 'correlator';
              break;
            case 'linux':
              expectedFolder = 'correlator_linux';
              break;
            default:
              throw new Error(`Unexpected root folder (${rootFolder}) for EDR mode of XP`);
          }

          const graphsDirectory = graphsDirectories[0].fsPath;
          const pathEntities = graphsDirectory.split(path.sep);
          const packagesDirectoryIndex = pathEntities.findIndex(
            (pe) => pe.toLocaleLowerCase() === expectedFolder
          );
          if (packagesDirectoryIndex === -1) {
            throw new FileSystemException(
              `Не найдена директория с модулем коррелятора для файла '${graphsDirectory}'`
            );
          }

          // Удаляем лишние элементы пути и собираем результирующий путь.
          const packageNameIndex = packagesDirectoryIndex + 2;
          pathEntities.splice(packageNameIndex);
          const correlatorDirectory = pathEntities.join(path.sep);

          if (!graphsDirectory) {
            throw new FileSystemException(`Путь к graphs.zip не выбран.`);
          }

          const metainfoPath = path.join(rootFolder, MetaInfo.METAINFO_FILENAME);
          if (!fs.existsSync(metainfoPath)) {
            throw new FileSystemException(
              `Путь к файлу описания пакета задан не верно: ${metainfoPath}!`
            );
          }

          // Проверка наличия скрипта сборки архива graphs.zip
          const edrPackager = path.join(
            this.config.getBuildToolsDirectoryFullPath(),
            'soldr-build',
            'gen_correlator_config.exe'
          );
          if (!fs.existsSync(edrPackager)) {
            throw new FileSystemException(
              `Путь к скрипту сборки graphs.zip задан не верно: ${edrPackager}`
            );
          }

          /** Типовая команда выглядит так:
           *   python tools/gen_correlator_config.py
           * 		--mvdir correlator/1.0.0
           * 		--crdir ../xp-rules/compiled-rules/windows
           * 		--taxonomy ../xp-rules/resources/build-resources/contracts/taxonomy/taxonomy.json
           * 		--metainfo ../xp-rules/rules/windows/metainfo.json
           */
          const mvdir = `--mvdir ${correlatorDirectory}`;
          const crdir = `--crdir ${this.config.getOutputDirectoryPath(packageName)}`;
          const taxonomy = `--taxonomy ${this.config.getTaxonomyFullPath()}`;
          const metainfo = `--metainfo ${metainfoPath}`;
          const command = `${edrPackager} ${mvdir} ${crdir} ${taxonomy} ${metainfo}`;

          outputChannel.appendLine(`XP :: Run command: ${command}`);
          const output = ProcessHelper.readProcessArgsOutputSync(
            `${edrPackager}`,
            [mvdir, crdir, taxonomy, metainfo],
            'utf-8'
          );
          outputChannel.appendLine(output);

          if (output.includes('done')) {
            DialogHelper.showInfo(`Пакет '${packageName}' собран успешно.`);
            return;
          }
          // TODO: тут нужно сделать ссылку или кнопку для перехода в нужную панель
          DialogHelper.showError(
            `Не удалось собрать пакет '${packageName}'. Подробности приведены в канале 'eXtraction and Processing' панели Output.`
          );
        } catch (error) {
          // TODO: Нужно все внутренние ошибки обрабатывть единообразно
          DialogHelper.showError(`Внутренняя ошибка расширения.\n ${error}`);
        } finally {
          outputChannel.appendLine('----------------------------------------');
          outputChannel.appendLine(`XP :: Packing ${packageName} package finished!`);
          outputChannel.appendLine('----------------------------------------');
        }
      }
    );
  }
}

export class PackEDRAllPackagesAction implements PackAction {
  constructor(private config: Configuration) {}

  public async run(packagePath: string, emitter: vscode.EventEmitter<string>): Promise<void> {
    // Выбираем директорию с модулями EDR.
    const packageName = path.basename(packagePath);
    const platform = packageName.charAt(0).toUpperCase() + packageName.slice(1);
    const moduleDirectories = await vscode.window.showOpenDialog({
      title: `Укажите путь к директории модуля EDR ${platform} Correlator`,
      canSelectMany: false,
      canSelectFolders: true,
      canSelectFiles: false,
      openLabel: 'Выбрать эту директорию',
      defaultUri: vscode.Uri.file(packagePath)
    });

    const moduleDirectory = moduleDirectories[0].fsPath;

    let expectedFolder = '';
    switch (packageName) {
      case 'windows':
        expectedFolder = 'correlator';
        break;
      case 'linux':
        expectedFolder = 'correlator_linux';
        break;
      default:
        throw new Error(`Unexpected package name (${packageName}) for EDR mode of XP`);
    }
    const pathEntities = moduleDirectory.split(path.sep);
    const packagesDirectoryIndex = pathEntities.findIndex(
      (pe) => pe.toLocaleLowerCase() === expectedFolder
    );
    if (packagesDirectoryIndex === -1) {
      throw new Error(
        `Задана не корректная директория с модулем коррелятора для платформы '${platform}'`
      );
    }

    if (!moduleDirectory) {
      DialogHelper.showError(this.config.getMessage('NoPathSelected'));
      return;
    }

    emitter.fire(
      `XP:: For ${platform} platform selected correlator module: ${moduleDirectory} \r\n`
    );

    const metainfoPath = path.join(packagePath, 'metainfo.json');
    if (!fs.existsSync(metainfoPath)) {
      DialogHelper.showError(`Путь к файлу описания пакета задан не верно: ${metainfoPath}!`);
      return;
    }

    // Проверка наличия скрипту сборки graphs.zip
    const edrPackager = path.join(
      this.config.getBuildToolsDirectoryFullPath(),
      'soldr-build',
      'gen_correlator_config.exe'
    );
    if (!fs.existsSync(edrPackager)) {
      DialogHelper.showError(`Путь к скрипту сборки graphs.zip задан не верно: ${edrPackager}`);
      return;
    }

    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: true
      },
      async (progress) => {
        // Выводим описание задачи.
        const packageDirPath = packagePath;
        const packageName = path.basename(packageDirPath);
        progress.report({ message: `Сборка пакета '${packageName}'` });

        try {
          const mvdir = `--mvdir ${moduleDirectory}`;
          const crdir = `--crdir ${this.config.getOutputDirectoryPath(packageName)}`;
          const taxonomy = `--taxonomy ${this.config.getTaxonomyFullPath()}`;
          const metainfo = `--metainfo ${metainfoPath}`;

          const command = `${edrPackager} ${mvdir} ${crdir} ${taxonomy} ${metainfo}`;

          emitter.fire(`\r\nXP:: Run command: ${command}\r\n`);

          const output = ProcessHelper.readProcessArgsOutputSync(
            `${edrPackager}`,
            [mvdir, crdir, taxonomy, metainfo],
            'utf-8'
          );

          emitter.fire(`\r\nXP:: Command output:\n${output.trim()}\n\n`);

          if (output.includes('done')) {
            DialogHelper.showInfo(`Пакет '${packageName}' собран успешно.`);
            return;
          }
          DialogHelper.showError(`Ошибка сборки пакета '${packageName}'. Смотри Terminal.`);
        } catch (error) {
          // TODO: Нужно все внутренние ошибки обрабатывть единообразно
          DialogHelper.showError(`Внутренняя ошибка расширения.\n ${error}.`);
        }
      }
    );
  }
}
