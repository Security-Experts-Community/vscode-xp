import * as https from 'https';
import * as vscode from 'vscode';

import { ProcessHelper } from '../helpers/processHelper';
import { Log } from '../extension';

interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  assets: GitHubReleaseAsset[];
}

export class KbtInstaller {
  private static readonly LatestReleaseUrl =
    'https://api.github.com/repos/vxcontrol/xp-kbt/releases/latest';
  private static readonly ReleasesUrl =
    'https://api.github.com/repos/vxcontrol/xp-kbt/releases?per_page=30';

  public static async installLatestIntoContainer(
    containerName: string,
    targetDirectory = '/home/coder/xp-kbt',
    outputChannel?: vscode.OutputChannel
  ): Promise<string> {
    const release = await this.getLatestRelease();
    return this.installReleaseIntoContainer(containerName, release, targetDirectory, outputChannel);
  }

  public static async listReleases(): Promise<GitHubRelease[]> {
    return this.getJson<GitHubRelease[]>(this.ReleasesUrl);
  }

  public static async installReleaseIntoContainer(
    containerName: string,
    release: GitHubRelease,
    targetDirectory = '/home/coder/xp-kbt',
    outputChannel?: vscode.OutputChannel
  ): Promise<string> {
    const asset = this.pickLinuxAsset(release);

    if (!asset) {
      throw new Error(
        `Could not find a Linux xp-kbt asset in release ${release.tag_name}. Open https://github.com/vxcontrol/xp-kbt/releases/latest and set xpConfig.docker.kbtBaseDirectory manually.`
      );
    }

    this.showOutputLinkedNotification(
      `Installing xp-kbt ${release.tag_name} into container '${containerName}'. Details are available in the extension output.`,
      outputChannel
    );
    Log.info(`XP container setup: installing xp-kbt ${release.tag_name}`);
    Log.info(`XP container setup: target ${containerName}:${targetDirectory}`);
    Log.info(`XP container setup: asset ${asset.name}`);

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
        title: `Downloading xp-kbt ${release.tag_name}`
      },
      async (progress) => {
        Log.progress(progress, `Installing into ${containerName}:${targetDirectory}`);

        const archivePath = `/tmp/${asset.name}`;
        const quotedTargetDirectory = this.shellQuote(targetDirectory);
        const quotedArchivePath = this.shellQuote(archivePath);
        const quotedDownloadUrl = this.shellQuote(asset.browser_download_url);
        const command = [
          'set -e',
          this.echoCommand('XP :: Ensuring container prerequisites'),
          this.getInstallPrerequisitesCommand(),
          this.echoCommand(`XP :: Creating KBT target directory ${targetDirectory}`),
          `mkdir -p ${quotedTargetDirectory}`,
          this.echoCommand(`XP :: Downloading ${asset.name}`),
          `curl -fL ${quotedDownloadUrl} -o ${quotedArchivePath}`,
          this.echoCommand('XP :: Extracting KBT archive'),
          this.getExtractCommand(archivePath, targetDirectory),
          this.echoCommand('XP :: Removing temporary archive'),
          `rm -f ${quotedArchivePath}`,
          this.echoCommand('XP :: Verifying KBT tools'),
          `test -x ${this.shellQuote(
            `${targetDirectory}/extra-tools/siemj/siemj`
          )} -o -x ${this.shellQuote(`${targetDirectory}/build-tools/normalize`)}`
        ].join(' && ');

        const result = await ProcessHelper.execute(
          'docker',
          ['exec', containerName, 'sh', '-lc', command],
          {
            encoding: 'utf-8',
            outputChannel
          }
        );

        if (result.exitCode !== 0) {
          throw new Error(
            `Failed to install xp-kbt in container '${containerName}'. ${result.output}`
          );
        }

        Log.progress(progress, `xp-kbt ${release.tag_name} installed`);
      }
    );

    return targetDirectory;
  }

  private static showOutputLinkedNotification(
    message: string,
    outputChannel?: vscode.OutputChannel
  ): void {
    if (!outputChannel) {
      void vscode.window.showInformationMessage(message);
      return;
    }

    void vscode.window.showInformationMessage(message, 'Show Output').then((answer) => {
      if (answer === 'Show Output') {
        outputChannel.show();
      }
    });
  }

  private static getInstallPrerequisitesCommand(): string {
    return [
      'if ! command -v curl >/dev/null 2>&1 || ! command -v tar >/dev/null 2>&1 || ! command -v unzip >/dev/null 2>&1; then',
      'if command -v apt-get >/dev/null 2>&1; then',
      'apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl tar unzip;',
      'elif command -v apk >/dev/null 2>&1; then',
      'apk add --no-cache ca-certificates curl tar unzip;',
      'else',
      'echo "Container must have curl, tar and unzip, or use a Debian/Alpine-based image."; exit 127;',
      'fi;',
      'fi'
    ].join(' ');
  }

  private static getExtractCommand(archivePath: string, targetDirectory: string): string {
    const quotedArchivePath = this.shellQuote(archivePath);
    const quotedTargetDirectory = this.shellQuote(targetDirectory);

    if (archivePath.endsWith('.zip')) {
      const extractDirectory = `${archivePath}.extract`;
      const quotedExtractDirectory = this.shellQuote(extractDirectory);

      return [
        `rm -rf ${quotedExtractDirectory}`,
        `mkdir -p ${quotedExtractDirectory}`,
        `unzip -q -o ${quotedArchivePath} -d ${quotedExtractDirectory}`,
        `find ${quotedTargetDirectory} -mindepth 1 -maxdepth 1 -exec rm -rf {} +`,
        `ENTRY_COUNT=$(find ${quotedExtractDirectory} -mindepth 1 -maxdepth 1 | wc -l | tr -d ' ')`,
        `SOURCE_DIR=${quotedExtractDirectory}`,
        `if [ "$ENTRY_COUNT" = "1" ]; then FIRST_ENTRY=$(find ${quotedExtractDirectory} -mindepth 1 -maxdepth 1 | head -n 1); if [ -d "$FIRST_ENTRY" ]; then SOURCE_DIR="$FIRST_ENTRY"; fi; fi`,
        `find "$SOURCE_DIR" -mindepth 1 -maxdepth 1 -exec mv {} ${quotedTargetDirectory}/ \\;`,
        `rm -rf ${quotedExtractDirectory}`
      ].join(' && ');
    }

    return `tar -xzf ${quotedArchivePath} -C ${quotedTargetDirectory} --strip-components=1`;
  }

  private static pickLinuxAsset(release: GitHubRelease): GitHubReleaseAsset | undefined {
    return release.assets.find((asset) => {
      const name = asset.name.toLowerCase();
      return (
        /linux|gnu|ubuntu|debian/.test(name) &&
        (name.endsWith('.tar.gz') || name.endsWith('.tgz') || name.endsWith('.zip'))
      );
    });
  }

  private static async getLatestRelease(): Promise<GitHubRelease> {
    return this.getJson<GitHubRelease>(this.LatestReleaseUrl);
  }

  private static async getJson<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
      https
        .get(
          url,
          {
            headers: {
              'User-Agent': 'SecurityExpertsCommunity.xp'
            }
          },
          (response) => {
            if (response.statusCode < 200 || response.statusCode >= 300) {
              reject(new Error(`GitHub release request failed with ${response.statusCode}`));
              return;
            }

            let data = '';
            response.setEncoding('utf8');
            response.on('data', (chunk) => (data += chunk));
            response.on('end', () => {
              try {
                resolve(JSON.parse(data) as T);
              } catch (error) {
                reject(error);
              }
            });
          }
        )
        .on('error', reject);
    });
  }

  private static shellQuote(value: string): string {
    return `'${value.replace(/'/g, `'\\''`)}'`;
  }

  private static echoCommand(message: string): string {
    return `echo ${this.shellQuote(message)}`;
  }
}
