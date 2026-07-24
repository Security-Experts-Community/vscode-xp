import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { ProcessHelper } from '../helpers/processHelper';
import { Configuration } from '../models/configuration';
import { KbtInstaller } from './kbtInstaller';
import { DEFAULT_CONTAINER_KBT_BASE_DIRECTORY } from './kbtToolPaths';
import { Log } from '../extension';

interface ContainerSelection {
  name: string;
  created: boolean;
  workspaceContainerPath?: string;
}

export class MacOSContainerSetup {
  private static readonly DEFAULT_TOOLS_IMAGE = 'mcr.microsoft.com/dotnet/sdk:8.0';
  private static readonly DEFAULT_KNOWLEDGEBASE_CONTAINER_PATH = '/workspaces/knowledgebase';
  private static readonly KBT_PATH_CANDIDATES = [
    DEFAULT_CONTAINER_KBT_BASE_DIRECTORY,
    '/opt/xp-kbt',
    '/usr/local/xp-kbt',
    '/workspaces/xp-kbt'
  ];

  public static async maybePrompt(config: Configuration): Promise<void> {
    if (!config.isLocalMacOS()) {
      return;
    }

    const setupIssue = await this.getMacOSDockerSetupIssue(config);
    if (!config.getMacOSShowContainerSetupPrompt() && !setupIssue) {
      return;
    }

    const buttons = setupIssue
      ? ['Configure', 'Show Output', 'Open README', 'Keep current']
      : ['Configure', 'Open README', 'Do not show again'];
    const message = setupIssue
      ? `XP Docker backend needs configuration: ${setupIssue}. Configure it now?`
      : 'XP tools are not available natively on macOS. Configure a container backend?';

    const answer = await vscode.window.showInformationMessage(
      message,
      ...buttons
    );

    switch (answer) {
      case 'Configure':
        try {
          await this.configure(config);
        } catch (error) {
          vscode.window.showErrorMessage(error.message);
        }
        break;
      case 'Open README':
        await vscode.env.openExternal(
          vscode.Uri.parse(
            'https://github.com/Security-Experts-Community/vscode-xp#macos-hybrid-mode'
          )
        );
        break;
      case 'Show Output':
        config.getOutputChannel().show();
        break;
      case 'Do not show again':
        await config.setMacOSShowContainerSetupPrompt(false);
        break;
    }
  }

  private static async getMacOSDockerSetupIssue(
    config: Configuration
  ): Promise<string | undefined> {
    const xpConfig = config.getWorkspaceConfiguration();
    const containerName = xpConfig.get<string>('docker.containerName');
    const workspaceHostPath = xpConfig.get<string>('docker.workspaceHostPath');
    const workspaceContainerPath = xpConfig.get<string>('docker.workspaceContainerPath');
    const kbtBaseDirectory = xpConfig.get<string>('docker.kbtBaseDirectory');

    if (!config.shouldUseDockerToolRunner()) {
      return containerName || workspaceHostPath || workspaceContainerPath || kbtBaseDirectory
        ? 'container backend is configured but not enabled'
        : undefined;
    }

    if (!containerName) {
      return 'container is not selected';
    }

    if (!workspaceHostPath) {
      return 'local knowledgebase path is not configured';
    }

    if (!fs.existsSync(workspaceHostPath)) {
      return `local knowledgebase path does not exist: ${workspaceHostPath}`;
    }

    if (!workspaceContainerPath) {
      return 'container knowledgebase mount path is not configured';
    }

    if (!kbtBaseDirectory) {
      return 'container KBT path is not configured';
    }

    if (!this.looksLikeKnowledgebaseRoot(workspaceHostPath)) {
      return 'selected host path does not look like a knowledgebase root';
    }

    const dockerAvailable = await this.isDockerAvailable();
    if (!dockerAvailable) {
      return 'Docker Desktop is not available';
    }

    const containerRunning = await this.isContainerRunning(containerName);
    if (!containerRunning) {
      return `container '${containerName}' is not running`;
    }

    const kbtAvailable = await this.isKbtAvailable(containerName, kbtBaseDirectory);
    if (!kbtAvailable) {
      return `KBT was not found in container at '${kbtBaseDirectory}'`;
    }

    return undefined;
  }

  /**
   * Recovery-сценарий для ситуации, когда XP-инструменты не отработали из-за отсутствия
   * запущенного контейнера. В зависимости от состояния предлагаем пользователю поднять уже
   * существующий контейнер либо создать/настроить новый. Возвращает true, если сценарий
   * обработан (пользователю показан интерактивный диалог) и общий обработчик ошибок больше
   * ничего показывать не должен.
   */
  public static async offerContainerRecovery(config: Configuration): Promise<boolean> {
    if (!config.isLocalMacOS()) {
      return false;
    }

    // Без Docker поднимать/создавать нечего — пусть общий обработчик покажет исходную ошибку
    // (например, «Docker is not installed …»).
    if (!(await this.isDockerAvailable())) {
      return false;
    }

    const containerName = config
      .getWorkspaceConfiguration()
      .get<string>('docker.containerName');

    // Контейнер не выбран в настройках — предлагаем настроить бэкенд с нуля.
    if (!containerName) {
      return this.promptConfigure(config, 'No XP tools container is configured.');
    }

    // Уже запущен — значит проблема в чём-то другом, отдаём общему обработчику.
    if (await this.isContainerRunning(containerName)) {
      return false;
    }

    // Контейнер существует, но остановлен — предлагаем поднять его.
    if (await this.containerExists(containerName)) {
      return this.promptStartContainer(config, containerName);
    }

    // Контейнер из настроек больше не существует — предлагаем создать новый.
    return this.promptConfigure(
      config,
      `XP tools container '${containerName}' does not exist.`
    );
  }

  private static async promptStartContainer(
    config: Configuration,
    containerName: string
  ): Promise<boolean> {
    const startAction = 'Start container';
    const outputAction = 'Show Output';

    const selection = await vscode.window.showErrorMessage(
      `XP tools container '${containerName}' is not running. Start it and re-run the test?`,
      startAction,
      outputAction
    );

    if (selection === outputAction) {
      config.getOutputChannel().show();
      return true;
    }

    if (selection !== startAction) {
      // Пользователь закрыл диалог — считаем, что уже сообщили ему о проблеме.
      return true;
    }

    const started = await this.startContainer(containerName, config.getOutputChannel());
    if (started) {
      vscode.window.showInformationMessage(
        `XP tools container '${containerName}' is running now. Re-run the test.`
      );
    } else {
      this.showOutputLinkedNotification(
        `Failed to start XP tools container '${containerName}'. See the extension output for details.`,
        config.getOutputChannel()
      );
    }

    return true;
  }

  private static async promptConfigure(
    config: Configuration,
    reason: string
  ): Promise<boolean> {
    const configureAction = 'Create container';
    const outputAction = 'Show Output';

    const selection = await vscode.window.showErrorMessage(
      `${reason} Configure an XP tools container now?`,
      configureAction,
      outputAction
    );

    if (selection === configureAction) {
      try {
        await this.configure(config);
      } catch (error) {
        vscode.window.showErrorMessage(error.message);
      }
    } else if (selection === outputAction) {
      config.getOutputChannel().show();
    }

    return true;
  }

  private static async containerExists(containerName: string): Promise<boolean> {
    // `docker inspect` завершается с кодом 0 для любого существующего контейнера — как
    // запущенного, так и остановленного, — поэтому годится для проверки существования.
    const result = await ProcessHelper.execute(
      'docker',
      ['inspect', '-f', '{{.State.Status}}', containerName],
      { encoding: 'utf-8' }
    );

    return result.exitCode === 0;
  }

  private static async startContainer(
    containerName: string,
    outputChannel: vscode.OutputChannel
  ): Promise<boolean> {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
        title: `Starting XP tools container '${containerName}'`
      },
      async () => {
        const result = await ProcessHelper.execute('docker', ['start', containerName], {
          encoding: 'utf-8',
          outputChannel
        });

        if (result.exitCode !== 0) {
          Log.error(
            `Failed to start XP tools container '${containerName}': ${result.output}`
          );
          return false;
        }

        return this.isContainerRunning(containerName);
      }
    );
  }

  public static async configure(config: Configuration): Promise<void> {
    const knowledgebaseFolder = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      title: 'Select local knowledgebase folder'
    });

    if (!knowledgebaseFolder?.[0]) {
      return;
    }

    const knowledgebaseHostPath = await this.resolveKnowledgebaseHostPath(
      knowledgebaseFolder[0].fsPath
    );
    await this.ensureDockerAvailable();
    const container = await this.pickContainer(knowledgebaseHostPath, config.getOutputChannel());
    if (!container) {
      return;
    }

    const containerName = container.name;
    const workspaceContainerPath =
      container.workspaceContainerPath ??
      (await this.detectContainerMountPath(containerName, knowledgebaseHostPath)) ??
      (await this.askContainerPath(
        'Knowledgebase container path',
        this.DEFAULT_KNOWLEDGEBASE_CONTAINER_PATH
      ));

    if (!workspaceContainerPath) {
      return;
    }

    // Явно заданный в настройках путь имеет приоритет над хардкод-кандидатами: пользователь
    // мог установить KBT в нестандартный каталог и прописать его сам.
    const configuredKbtBaseDirectory = config
      .getWorkspaceConfiguration()
      .get<string>('docker.kbtBaseDirectory');

    let kbtBaseDirectory = await this.detectKbtBaseDirectory(
      containerName,
      configuredKbtBaseDirectory
    );

    if (!kbtBaseDirectory) {
      kbtBaseDirectory = await this.resolveMissingKbt(containerName, config.getOutputChannel());
    }

    if (!kbtBaseDirectory) {
      return;
    }

    const xpConfig = config.getWorkspaceConfiguration();
    const hostOutputDirectory = path.join(knowledgebaseHostPath, 'tmp', 'xp-output');
    await fs.promises.mkdir(hostOutputDirectory, { recursive: true });

    await xpConfig.update('toolExecutionMode', 'docker', vscode.ConfigurationTarget.Workspace);
    await xpConfig.update(
      'outputDirectoryPath',
      hostOutputDirectory,
      vscode.ConfigurationTarget.Workspace
    );
    await xpConfig.update(
      'docker.workspaceHostPath',
      knowledgebaseHostPath,
      vscode.ConfigurationTarget.Workspace
    );
    await xpConfig.update(
      'docker.workspaceContainerPath',
      workspaceContainerPath,
      vscode.ConfigurationTarget.Workspace
    );
    await xpConfig.update(
      'docker.kbtBaseDirectory',
      kbtBaseDirectory,
      vscode.ConfigurationTarget.Workspace
    );
    await xpConfig.update(
      'docker.outputDirectoryPath',
      path.posix.join(workspaceContainerPath, 'tmp', 'xp-output'),
      vscode.ConfigurationTarget.Workspace
    );

    await xpConfig.update(
      'docker.containerName',
      containerName,
      vscode.ConfigurationTarget.Workspace
    );

    await config.setMacOSShowContainerSetupPrompt(false);

    vscode.window.showInformationMessage(
      `XP container backend configured for '${containerName}'.`
    );
  }

  private static async ensureDockerAvailable(): Promise<void> {
    const result = await ProcessHelper.execute('docker', ['version'], {
      encoding: 'utf-8',
      checkCommandBeforeExecution: true
    });

    if (result.exitCode !== 0) {
      throw new Error('Docker is not available. Install Docker Desktop and start it first.');
    }
  }

  private static async pickContainer(
    knowledgebaseHostPath: string,
    outputChannel: vscode.OutputChannel
  ): Promise<ContainerSelection | undefined> {
    const result = await ProcessHelper.execute(
      'docker',
      ['ps', '--format', '{{.Names}}'],
      { encoding: 'utf-8' }
    );

    const containerNames = result.output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line);

    const createContainerLabel = 'Create new XP tools container';
    const items = [
      {
        label: createContainerLabel,
        description: 'Bind mount the selected knowledgebase and install xp-kbt'
      },
      ...containerNames.map((name) => ({
        label: name,
        description: 'Use existing running container'
      }))
    ];

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder:
        containerNames.length === 0
          ? 'No running XP backend containers found'
          : 'Select or create XP backend container'
    });

    if (!selected) {
      return undefined;
    }

    if (selected.label === createContainerLabel) {
      return this.createToolsContainer(knowledgebaseHostPath, outputChannel);
    }

    return {
      name: selected.label,
      created: false
    };
  }

  private static async createToolsContainer(
    knowledgebaseHostPath: string,
    outputChannel: vscode.OutputChannel
  ): Promise<ContainerSelection | undefined> {
    const defaultName = this.makeDefaultContainerName(knowledgebaseHostPath);
    const containerName = await vscode.window.showInputBox({
      prompt: 'New Docker container name',
      value: defaultName,
      ignoreFocusOut: true,
      validateInput: (input) =>
        /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(input)
          ? undefined
          : 'Use letters, numbers, dots, underscores and hyphens'
    });

    if (!containerName) {
      return undefined;
    }

    const workspaceContainerPath =
      (await this.askContainerPath(
        'Knowledgebase container path',
        this.DEFAULT_KNOWLEDGEBASE_CONTAINER_PATH
      )) ?? this.DEFAULT_KNOWLEDGEBASE_CONTAINER_PATH;

    this.showOutputLinkedNotification(
      `Creating XP tools container '${containerName}'. Details are available in the extension output.`,
      outputChannel
    );
    Log.info(`XP container setup: creating container '${containerName}'`);
    Log.info(`XP container setup: image ${this.DEFAULT_TOOLS_IMAGE}`);
    Log.info(`XP container setup: platform linux/amd64`);
    Log.info(`XP container setup: mounting ${knowledgebaseHostPath} -> ${workspaceContainerPath}`);

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
        title: `Creating XP tools container '${containerName}'`
      },
      async (progress) => {
        Log.progress(progress, `Pulling/starting Docker image ${this.DEFAULT_TOOLS_IMAGE}`);
        const result = await ProcessHelper.execute(
          'docker',
          [
            'run',
            '-d',
            '--platform',
            'linux/amd64',
            '--name',
            containerName,
            '-v',
            `${knowledgebaseHostPath}:${workspaceContainerPath}`,
            '-w',
            workspaceContainerPath,
            this.DEFAULT_TOOLS_IMAGE,
            'sleep',
            'infinity'
          ],
          {
            encoding: 'utf-8',
            outputChannel
          }
        );

        if (result.exitCode !== 0) {
          throw new Error(
            `Failed to create XP tools container. ${result.output || 'Check Docker Desktop and image pull permissions.'}`
          );
        }

        Log.progress(progress, `XP tools container '${containerName}' is running`);
      }
    );

    return {
      name: containerName,
      created: true,
      workspaceContainerPath
    };
  }

  private static makeDefaultContainerName(knowledgebaseHostPath: string): string {
    const folderName = path.basename(path.resolve(knowledgebaseHostPath)) || 'knowledgebase';
    const safeFolderName = folderName.replace(/[^a-zA-Z0-9_.-]/g, '-').replace(/^-+/, '');
    const suffix = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 12);
    return `xp-tools-${safeFolderName || 'kb'}-${suffix}`.slice(0, 64);
  }

  private static showOutputLinkedNotification(
    message: string,
    outputChannel: vscode.OutputChannel
  ): void {
    void vscode.window.showInformationMessage(message, 'Show Output').then((answer) => {
      if (answer === 'Show Output') {
        outputChannel.show();
      }
    });
  }

  private static async resolveKnowledgebaseHostPath(selectedPath: string): Promise<string> {
    const detectedPath = this.findKnowledgebaseRoot(selectedPath);

    if (!detectedPath || detectedPath === selectedPath) {
      return selectedPath;
    }

    const answer = await vscode.window.showInformationMessage(
      `Knowledgebase root was detected at '${detectedPath}'. Use it for Docker bind mount?`,
      'Use detected root',
      'Use selected folder'
    );

    return answer === 'Use selected folder' ? selectedPath : detectedPath;
  }

  private static findKnowledgebaseRoot(startPath: string): string | undefined {
    let currentPath = path.resolve(startPath);

    while (true) {
      if (this.looksLikeKnowledgebaseRoot(currentPath)) {
        return currentPath;
      }

      const parentPath = path.dirname(currentPath);
      if (parentPath === currentPath) {
        return undefined;
      }

      currentPath = parentPath;
    }
  }

  private static looksLikeKnowledgebaseRoot(candidatePath: string): boolean {
    const packagesPath = path.join(candidatePath, 'packages');
    const contentTypesPath = path.join(candidatePath, 'content_types');
    const rulesPath = path.join(candidatePath, 'rules');
    const metadataPath = path.join(candidatePath, 'metainfo.yaml');

    return (
      fs.existsSync(packagesPath) ||
      fs.existsSync(contentTypesPath) ||
      fs.existsSync(rulesPath) ||
      fs.existsSync(metadataPath)
    );
  }

  private static async detectContainerMountPath(
    containerName: string,
    hostPath: string
  ): Promise<string | undefined> {
    const result = await ProcessHelper.execute(
      'docker',
      ['inspect', '--format', '{{json .Mounts}}', containerName],
      { encoding: 'utf-8' }
    );

    if (result.exitCode !== 0) {
      return undefined;
    }

    try {
      const mounts = JSON.parse(result.output.trim()) as Array<{
        Source?: string;
        Destination?: string;
      }>;

      const normalizedHostPath = path.resolve(hostPath);
      const matchingMount = mounts
        .filter((mount) => mount.Source && mount.Destination)
        .sort((a, b) => b.Source.length - a.Source.length)
        .find((mount) => {
          const source = path.resolve(mount.Source);
          return normalizedHostPath === source || normalizedHostPath.startsWith(source + path.sep);
        });

      if (!matchingMount) {
        return undefined;
      }

      const relativePath = path.relative(path.resolve(matchingMount.Source), normalizedHostPath);
      return relativePath
        ? path.posix.join(matchingMount.Destination, relativePath.split(path.sep).join('/'))
        : matchingMount.Destination;
    } catch {
      return undefined;
    }
  }

  private static async detectKbtBaseDirectory(
    containerName: string,
    preferredBaseDirectory?: string
  ): Promise<string | undefined> {
    // Сначала проверяем явно заданный путь (если он есть и ещё не в списке кандидатов),
    // затем — известные стандартные места установки xp-kbt.
    const trimmedPreferred = preferredBaseDirectory?.replace(/\/+$/, '');
    const candidates =
      trimmedPreferred && !this.KBT_PATH_CANDIDATES.includes(trimmedPreferred)
        ? [trimmedPreferred, ...this.KBT_PATH_CANDIDATES]
        : this.KBT_PATH_CANDIDATES;

    for (const candidate of candidates) {
      const result = await ProcessHelper.execute(
        'docker',
        [
          'exec',
          containerName,
          'sh',
          '-lc',
          `test -x '${candidate}/extra-tools/siemj/siemj' -o -x '${candidate}/build-tools/normalize'`
        ],
        { encoding: 'utf-8' }
      );

      if (result.exitCode === 0) {
        return candidate;
      }
    }

    return undefined;
  }

  private static async isDockerAvailable(): Promise<boolean> {
    try {
      const result = await ProcessHelper.execute('docker', ['version'], {
        encoding: 'utf-8',
        checkCommandBeforeExecution: true
      });

      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  private static async isContainerRunning(containerName: string): Promise<boolean> {
    const result = await ProcessHelper.execute(
      'docker',
      ['inspect', '-f', '{{.State.Running}}', containerName],
      { encoding: 'utf-8' }
    );

    return result.exitCode === 0 && result.output.trim() === 'true';
  }

  private static async isKbtAvailable(
    containerName: string,
    kbtBaseDirectory: string
  ): Promise<boolean> {
    const result = await ProcessHelper.execute(
      'docker',
      [
        'exec',
        containerName,
        'sh',
        '-lc',
        `test -x '${kbtBaseDirectory}/extra-tools/siemj/siemj' -o -x '${kbtBaseDirectory}/build-tools/normalize'`
      ],
      { encoding: 'utf-8' }
    );

    return result.exitCode === 0;
  }

  private static async resolveMissingKbt(
    containerName: string,
    outputChannel: vscode.OutputChannel
  ): Promise<string | undefined> {
    const action = await vscode.window.showQuickPick(
      [
        {
          label: 'Download latest xp-kbt',
          description: 'Recommended'
        },
        {
          label: 'Choose xp-kbt version',
          description: 'Select one of the recent GitHub releases'
        },
        {
          label: 'Enter path manually',
          description: 'Use already installed KBT in the container'
        }
      ],
      {
        placeHolder: `xp-kbt was not found in container '${containerName}'`
      }
    );

    switch (action?.label) {
      case 'Download latest xp-kbt':
        return KbtInstaller.installLatestIntoContainer(
          containerName,
          DEFAULT_CONTAINER_KBT_BASE_DIRECTORY,
          outputChannel
        );
      case 'Choose xp-kbt version':
        return this.chooseAndInstallKbtVersion(containerName, outputChannel);
      case 'Enter path manually':
        return this.askContainerPath(
          'KBT base directory in container',
          DEFAULT_CONTAINER_KBT_BASE_DIRECTORY
        );
      default:
        return undefined;
    }
  }

  private static async chooseAndInstallKbtVersion(
    containerName: string,
    outputChannel: vscode.OutputChannel
  ): Promise<string | undefined> {
    const releases = await KbtInstaller.listReleases();
    const selectedRelease = await vscode.window.showQuickPick(
      releases.map((release) => ({
        label: release.tag_name,
        description: release.assets.map((asset) => asset.name).join(', '),
        release
      })),
      {
        placeHolder: 'Select xp-kbt release'
      }
    );

    if (!selectedRelease) {
      return undefined;
    }

    const targetDirectory = await this.askContainerPath(
      'KBT install directory in container',
      `${DEFAULT_CONTAINER_KBT_BASE_DIRECTORY}-${selectedRelease.release.tag_name}`
    );

    if (!targetDirectory) {
      return undefined;
    }

    return KbtInstaller.installReleaseIntoContainer(
      containerName,
      selectedRelease.release,
      targetDirectory,
      outputChannel
    );
  }

  private static async askContainerPath(
    prompt: string,
    value: string
  ): Promise<string | undefined> {
    const result = await vscode.window.showInputBox({
      prompt,
      value,
      ignoreFocusOut: true,
      validateInput: (input) => (input.startsWith('/') ? undefined : 'Use an absolute Linux path')
    });

    return result?.replace(/\/+$/, '');
  }
}
