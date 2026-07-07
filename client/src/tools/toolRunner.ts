import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import {
  ExecutionProcessOptions,
  ExecutionResult,
  ProcessHelper
} from '../helpers/processHelper';
import { XpException } from '../models/xpException';
import { PathMapper, PathMapping } from './pathMapper';

export type ToolExecutionMode = 'auto' | 'local' | 'docker';

export interface ToolRunOptions extends ExecutionProcessOptions {
  cwd?: string;
  allowNonZeroExitCode?: boolean;
}

export interface ToolRunner {
  runTool(command: string, args: string[], options?: ToolRunOptions): Promise<ExecutionResult>;
  runKbt(args: string[], options?: ToolRunOptions): Promise<ExecutionResult>;
  runSiemj(args: string[], options?: ToolRunOptions): Promise<ExecutionResult>;
  runNormalizer(args: string[], options?: ToolRunOptions): Promise<ExecutionResult>;
}

export interface ToolRunnerFactoryOptions {
  mode: ToolExecutionMode;
  kbtBaseDirectory?: string;
  outputDirectoryPath?: string;
  docker: DockerToolRunnerOptions;
}

export interface DockerToolRunnerOptions {
  containerName?: string;
  composeFile?: string;
  serviceName?: string;
  workspaceHostPath?: string;
  workspaceContainerPath?: string;
  kbtBaseDirectory?: string;
  outputDirectoryPath?: string;
  extraMappings?: PathMapping[];
}

export class LocalToolRunner implements ToolRunner {
  constructor(private readonly kbtBaseDirectory?: string) {}

  public runTool(
    command: string,
    args: string[],
    options: ToolRunOptions = {}
  ): Promise<ExecutionResult> {
    return ProcessHelper.execute(command, args, options);
  }

  public runKbt(args: string[], options?: ToolRunOptions): Promise<ExecutionResult> {
    return this.runTool(this.resolveKbtTool('kbtools'), args, options);
  }

  public runSiemj(args: string[], options?: ToolRunOptions): Promise<ExecutionResult> {
    return this.runTool(this.resolveKbtTool(path.join('extra-tools', 'siemj', this.exe('siemj'))), args, options);
  }

  public runNormalizer(args: string[], options?: ToolRunOptions): Promise<ExecutionResult> {
    return this.runTool(this.resolveKbtTool(path.join('build-tools', this.exe('normalize'))), args, options);
  }

  private resolveKbtTool(relativePath: string): string {
    if (!this.kbtBaseDirectory) {
      throw new XpException('KBT base directory is not configured.');
    }

    return path.join(this.kbtBaseDirectory, relativePath);
  }

  private exe(command: string): string {
    return process.platform === 'win32' ? `${command}.exe` : command;
  }
}

export class DockerToolRunner implements ToolRunner {
  private readonly pathMapper: PathMapper;

  constructor(private readonly options: DockerToolRunnerOptions) {
    this.pathMapper = new PathMapper({
      workspaceHostPath: options.workspaceHostPath,
      workspaceContainerPath: options.workspaceContainerPath,
      extraMappings: options.extraMappings
    });
  }

  public async runTool(
    command: string,
    args: string[],
    options: ToolRunOptions = {}
  ): Promise<ExecutionResult> {
    await this.ensureDockerAvailable();
    const containerName = await this.getContainerName();
    await this.ensureContainerRunning(containerName);

    const mappingValidation = this.pathMapper.validateMapping();
    if (!mappingValidation.isValid) {
      throw new XpException(`Path mapping failed. ${mappingValidation.message}`);
    }

    const mappedCommand = this.mapCommand(command);
    const mappedArgs = await this.mapArgs(args);
    const dockerArgs = this.buildDockerExecArgs(containerName, mappedCommand, mappedArgs, options);

    const result = await ProcessHelper.execute('docker', dockerArgs, {
      ...options,
      encoding: options.encoding ?? 'utf-8'
    });

    if (result.exitCode === 127 || result.output.includes('executable file not found')) {
      throw new XpException(
        `Tool not found in container '${containerName}'. Check xpConfig.docker.kbtBaseDirectory and make sure the container has XP tools installed. Missing command: '${mappedCommand}'.`
      );
    }

    if (result.exitCode !== 0 && !result.isInterrupted && !options.allowNonZeroExitCode) {
      if (
        process.platform === 'darwin' &&
        (result.exitCode === 132 || result.exitCode === 133)
      ) {
        throw new XpException(
          `Command exited with code ${result.exitCode}. The XP tool binary is likely incompatible with the container CPU architecture. Re-run the macOS setup wizard and create a new XP tools container; it will use linux/amd64 for xp-kbt compatibility.`
        );
      }

      throw new XpException(
        `Command exited with non-zero code ${result.exitCode}. Check XP output for details.`
      );
    }

    return result;
  }

  public runKbt(args: string[], options?: ToolRunOptions): Promise<ExecutionResult> {
    return this.runTool(this.getContainerKbtTool('kbtools'), args, options);
  }

  public runSiemj(args: string[], options?: ToolRunOptions): Promise<ExecutionResult> {
    return this.runTool(this.getContainerKbtTool('extra-tools/siemj/siemj'), args, options);
  }

  public runNormalizer(args: string[], options?: ToolRunOptions): Promise<ExecutionResult> {
    return this.runTool(this.getContainerKbtTool('build-tools/normalize'), args, options);
  }

  public getPathMapper(): PathMapper {
    return this.pathMapper;
  }

  public buildDockerExecArgs(
    containerName: string,
    command: string,
    args: string[],
    options: ToolRunOptions = {}
  ): string[] {
    const dockerArgs = ['exec', '-i'];

    if (options.cwd) {
      dockerArgs.push('-w', this.pathMapper.hostToContainer(options.cwd));
    }

    dockerArgs.push(containerName, command, ...args);
    return dockerArgs;
  }

  private async ensureDockerAvailable(): Promise<void> {
    const result = await ProcessHelper.execute('docker', ['version'], {
      encoding: 'utf-8',
      checkCommandBeforeExecution: true
    });

    if (result.exitCode !== 0) {
      throw new XpException(
        'Docker is not installed or is not available in PATH. Install Docker Desktop and start it, then retry the XP command.'
      );
    }
  }

  private async ensureContainerRunning(containerName: string): Promise<void> {
    const result = await ProcessHelper.execute(
      'docker',
      ['inspect', '-f', '{{.State.Running}}', containerName],
      { encoding: 'utf-8' }
    );

    if (result.exitCode !== 0 || !result.output.trim().includes('true')) {
      throw new XpException(
        `Container '${containerName}' is not running. Start a container with XP tools, then retry.`
      );
    }
  }

  private async getContainerName(): Promise<string> {
    if (this.options.containerName) {
      return this.options.containerName;
    }

    const discovered = await this.discoverContainer();
    if (discovered) {
      return discovered;
    }

    throw new XpException(
      'Container not running. Set xpConfig.docker.containerName or start/select a container with XP tools.'
    );
  }

  private async discoverContainer(): Promise<string | undefined> {
    const containers = await ProcessHelper.execute(
      'docker',
      ['ps', '--format', '{{.Names}}'],
      { encoding: 'utf-8' }
    );

    if (containers.exitCode !== 0) {
      return undefined;
    }

    const names = containers.output
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter((name) => name);

    const xpNamed = names.find((name) => /vscode.*xp|xp.*workspace|knowledgebase|kbt/i.test(name));
    if (xpNamed) {
      return xpNamed;
    }

    const mounted = await this.discoverContainerByInspect(names);
    if (mounted) {
      return mounted;
    }

    return undefined;
  }

  private async discoverContainerByInspect(names: string[]): Promise<string | undefined> {
    for (const name of names) {
      const result = await ProcessHelper.execute(
        'docker',
        [
          'inspect',
          '--format',
          '{{json .Config.Labels}} {{json .Mounts}}',
          name
        ],
        { encoding: 'utf-8' }
      );

      if (result.exitCode !== 0) {
        continue;
      }

      if (this.containerMatchesConfiguration(result.output)) {
        return name;
      }
    }

    return undefined;
  }

  private containerMatchesConfiguration(inspectOutput: string): boolean {
    const workspaceHostPath = this.options.workspaceHostPath;
    const workspaceContainerPath = this.options.workspaceContainerPath;

    if (!workspaceHostPath && !workspaceContainerPath) {
      return false;
    }

    return [workspaceHostPath, workspaceContainerPath]
      .filter((value) => value)
      .some((value) => inspectOutput.includes(value));
  }

  private mapCommand(command: string): string {
    return this.pathMapper.hostToContainer(command);
  }

  private async mapArgs(args: string[]): Promise<string[]> {
    const mappedArgs: string[] = [];

    for (const arg of args) {
      if (arg.endsWith('.conf') && fs.existsSync(arg)) {
        mappedArgs.push(await this.createMappedConfig(arg));
      } else {
        mappedArgs.push(this.pathMapper.mapCommandArgument(arg));
      }
    }

    return mappedArgs;
  }

  private async createMappedConfig(configPath: string): Promise<string> {
    const content = await fs.promises.readFile(configPath, 'utf-8');
    const mappedContent = this.pathMapper.mapText(content);
    const mappedConfigPath = `${configPath}.container`;
    await fs.promises.writeFile(mappedConfigPath, mappedContent, 'utf-8');
    return this.pathMapper.hostToContainer(mappedConfigPath);
  }

  private getContainerKbtTool(relativePath: string): string {
    const baseDirectory = this.options.kbtBaseDirectory || '/home/coder/xp-kbt';
    return path.posix.join(baseDirectory, relativePath);
  }
}

export class ToolRunnerFactory {
  public static create(options: ToolRunnerFactoryOptions): ToolRunner {
    const mode = this.resolveMode(options.mode);

    if (mode === 'docker') {
      const extraMappings: PathMapping[] = [...(options.docker.extraMappings ?? [])];
      if (options.outputDirectoryPath && options.docker.outputDirectoryPath) {
        extraMappings.push({
          hostPath: options.outputDirectoryPath,
          containerPath: options.docker.outputDirectoryPath
        });
      }

      return new DockerToolRunner({
        ...options.docker,
        extraMappings
      });
    }

    return new LocalToolRunner(options.kbtBaseDirectory);
  }

  public static resolveMode(mode: ToolExecutionMode): 'local' | 'docker' {
    if (mode === 'docker') {
      return 'docker';
    }

    if (mode === 'local') {
      return 'local';
    }

    return process.platform === 'darwin' && !vscode.env.remoteName ? 'docker' : 'local';
  }
}
