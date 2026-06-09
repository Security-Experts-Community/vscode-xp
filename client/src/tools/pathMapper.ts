import * as path from 'path';

export interface PathMapping {
  hostPath: string;
  containerPath: string;
}

export interface PathMapperOptions {
  workspaceHostPath?: string;
  workspaceContainerPath?: string;
  extraMappings?: PathMapping[];
}

export interface PathMappingValidationResult {
  isValid: boolean;
  message?: string;
}

export class PathMapper {
  private readonly mappings: PathMapping[];

  constructor(options: PathMapperOptions) {
    this.mappings = [];

    if (options.workspaceHostPath && options.workspaceContainerPath) {
      this.mappings.push({
        hostPath: PathMapper.normalizeHostPath(options.workspaceHostPath),
        containerPath: PathMapper.normalizeContainerPath(options.workspaceContainerPath)
      });
    }

    for (const mapping of options.extraMappings ?? []) {
      if (!mapping.hostPath || !mapping.containerPath) {
        continue;
      }

      this.mappings.push({
        hostPath: PathMapper.normalizeHostPath(mapping.hostPath),
        containerPath: PathMapper.normalizeContainerPath(mapping.containerPath)
      });
    }

    this.mappings.sort((a, b) => b.hostPath.length - a.hostPath.length);
  }

  public hostToContainer(inputPath: string): string {
    return this.mapPath(inputPath, 'hostToContainer');
  }

  public containerToHost(inputPath: string): string {
    return this.mapPath(inputPath, 'containerToHost');
  }

  public resolveWorkspaceMount(): PathMapping | undefined {
    return this.mappings[0];
  }

  public validateMapping(): PathMappingValidationResult {
    if (this.mappings.length === 0) {
      return {
        isValid: false,
        message:
          'Path mapping is not configured. Set xpConfig.docker.workspaceHostPath and xpConfig.docker.workspaceContainerPath.'
      };
    }

    return { isValid: true };
  }

  public mapCommandArgument(argument: string): string {
    if (!argument) {
      return argument;
    }

    const prefixedPath = /^([^=]+)=(.+)$/.exec(argument);
    if (prefixedPath) {
      if (!this.shouldMapInput(prefixedPath[2])) {
        return argument;
      }

      return `${prefixedPath[1]}=${this.hostToContainer(prefixedPath[2])}`;
    }

    if (!this.shouldMapInput(argument)) {
      return argument;
    }

    return this.hostToContainer(argument);
  }

  public mapText(text: string): string {
    let result = text;
    for (const mapping of this.mappings) {
      result = result.split(mapping.hostPath).join(mapping.containerPath);
    }

    return result;
  }

  private mapPath(inputPath: string, direction: 'hostToContainer' | 'containerToHost'): string {
    if (!this.shouldMapInput(inputPath)) {
      return inputPath;
    }

    const normalizedInput =
      direction === 'hostToContainer'
        ? PathMapper.normalizeHostPath(inputPath)
        : PathMapper.normalizeContainerPath(inputPath);

    for (const mapping of this.mappings) {
      const from = direction === 'hostToContainer' ? mapping.hostPath : mapping.containerPath;
      const to = direction === 'hostToContainer' ? mapping.containerPath : mapping.hostPath;

      if (normalizedInput === from) {
        return to;
      }

      if (normalizedInput.startsWith(from + path.sep) || normalizedInput.startsWith(from + '/')) {
        const relativePath = normalizedInput.substring(from.length).replace(/^[\\/]/, '');
        return PathMapper.joinContainerAware(to, relativePath);
      }
    }

    return inputPath;
  }

  private static joinContainerAware(basePath: string, relativePath: string): string {
    if (!relativePath) {
      return basePath;
    }

    if (basePath.includes('\\')) {
      return path.win32.join(basePath, relativePath);
    }

    return path.posix.join(basePath, relativePath.split(path.sep).join('/'));
  }

  private static normalizeHostPath(inputPath: string): string {
    return path.resolve(inputPath);
  }

  private static normalizeContainerPath(inputPath: string): string {
    return inputPath.replace(/\\/g, '/').replace(/\/+$/, '');
  }

  private shouldMapInput(inputPath: string): boolean {
    if (path.isAbsolute(inputPath) || inputPath.startsWith('/')) {
      return true;
    }

    return this.mappings.some(
      (mapping) =>
        inputPath.startsWith(mapping.hostPath) || inputPath.startsWith(mapping.containerPath)
    );
  }
}
