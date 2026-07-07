import * as childProcess from 'child_process';
import * as path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import { PathMapper, PathMapping } from './pathMapper';

interface ProxyConfig {
  containerName: string;
  workspaceHostPath: string;
  workspaceContainerPath: string;
  kbtBaseDirectory: string;
  outputHostPath?: string;
  outputContainerPath?: string;
}

class LspMessageStream {
  private buffer = Buffer.alloc(0);

  public constructor(
    private readonly onMessage: (message: unknown) => void,
    private readonly onError: (error: Error) => void
  ) {}

  public push(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (true) {
      const separatorIndex = this.buffer.indexOf('\r\n\r\n');
      if (separatorIndex === -1) {
        return;
      }

      const header = this.buffer.slice(0, separatorIndex).toString('utf-8');
      const contentLength = this.parseContentLength(header);
      if (contentLength === undefined) {
        this.onError(new Error(`Invalid LSP header: ${header}`));
        return;
      }

      const bodyStart = separatorIndex + 4;
      const bodyEnd = bodyStart + contentLength;
      if (this.buffer.length < bodyEnd) {
        return;
      }

      const body = this.buffer.slice(bodyStart, bodyEnd).toString('utf-8');
      this.buffer = this.buffer.slice(bodyEnd);

      try {
        this.onMessage(JSON.parse(body));
      } catch (error) {
        this.onError(error as Error);
      }
    }
  }

  private parseContentLength(header: string): number | undefined {
    const match = /Content-Length:\s*(\d+)/i.exec(header);
    if (!match) {
      return undefined;
    }

    return Number(match[1]);
  }
}

class LspDockerProxy {
  private readonly pathMapper: PathMapper;
  private readonly languageServerPath: string;

  public constructor(private readonly config: ProxyConfig) {
    const extraMappings: PathMapping[] = [];
    if (config.outputHostPath && config.outputContainerPath) {
      extraMappings.push({
        hostPath: config.outputHostPath,
        containerPath: config.outputContainerPath
      });
    }

    this.pathMapper = new PathMapper({
      workspaceHostPath: config.workspaceHostPath,
      workspaceContainerPath: config.workspaceContainerPath,
      extraMappings
    });

    this.languageServerPath = path.posix.join(
      config.kbtBaseDirectory,
      'xp-sdk',
      'cli',
      'evt-xp-language-server'
    );
  }

  public run(): void {
    const dockerArgs = ['exec', '-i', this.config.containerName, this.languageServerPath];
    const child = childProcess.spawn('docker', dockerArgs, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const clientInput = new LspMessageStream(
      (message) => {
        this.writeFramedMessage(child.stdin, this.mapMessage(message, 'hostToContainer'));
      },
      (error) => this.logError(`Failed to decode client LSP message: ${error.message}`)
    );

    const serverInput = new LspMessageStream(
      (message) => {
        this.writeFramedMessage(process.stdout, this.mapMessage(message, 'containerToHost'));
      },
      (error) => this.logError(`Failed to decode container LSP message: ${error.message}`)
    );

    process.stdin.on('data', (chunk: Buffer) => clientInput.push(chunk));
    child.stdout.on('data', (chunk: Buffer) => serverInput.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => process.stderr.write(chunk));

    process.stdin.on('end', () => child.stdin.end());
    process.stdin.on('error', (error) => this.logError(`Proxy stdin error: ${error.message}`));
    child.on('error', (error) => {
      this.logError(`Failed to start Docker LSP proxy: ${error.message}`);
      process.exit(1);
    });
    child.on('close', (code) => process.exit(code ?? 0));

    process.on('SIGINT', () => child.kill('SIGINT'));
    process.on('SIGTERM', () => child.kill('SIGTERM'));
  }

  private writeFramedMessage(stream: NodeJS.WritableStream, message: unknown): void {
    const payload = Buffer.from(JSON.stringify(message), 'utf-8');
    stream.write(`Content-Length: ${payload.length}\r\n\r\n`);
    stream.write(payload);
  }

  private mapMessage(
    value: unknown,
    direction: 'hostToContainer' | 'containerToHost'
  ): unknown {
    if (typeof value === 'string') {
      return this.mapString(value, direction);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.mapMessage(item, direction));
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, nestedValue]) => [key, this.mapMessage(nestedValue, direction)])
      );
    }

    return value;
  }

  private mapString(value: string, direction: 'hostToContainer' | 'containerToHost'): string {
    if (value.startsWith('file://')) {
      try {
        const filePath = fileURLToPath(value);
        const mappedPath =
          direction === 'hostToContainer'
            ? this.pathMapper.hostToContainer(filePath)
            : this.pathMapper.containerToHost(filePath);
        return pathToFileURL(mappedPath).toString();
      } catch {
        return value;
      }
    }

    if (path.isAbsolute(value) || value.startsWith('/')) {
      return direction === 'hostToContainer'
        ? this.pathMapper.hostToContainer(value)
        : this.pathMapper.containerToHost(value);
    }

    return value;
  }

  private logError(message: string): void {
    process.stderr.write(`[xp-lsp-proxy] ${message}\n`);
  }
}

function readConfigFromArgs(): ProxyConfig {
  const encodedConfig = process.argv[2];
  if (!encodedConfig) {
    throw new Error('Missing Docker LSP proxy configuration.');
  }

  return JSON.parse(Buffer.from(encodedConfig, 'base64').toString('utf-8')) as ProxyConfig;
}

const config = readConfigFromArgs();
new LspDockerProxy(config).run();
