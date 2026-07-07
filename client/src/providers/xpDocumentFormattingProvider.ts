import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { Log } from '../extension';
import { Configuration } from '../models/configuration';
import { XpException } from '../models/xpException';
import { LocalToolRunner, ToolRunner } from '../tools/toolRunner';

export class XpDocumentFormattingProvider implements vscode.DocumentFormattingEditProvider {
  private static readonly SUPPORTED_LANGUAGES = ['xp', 'en', 'co', 'agr', 'flt'];

  public constructor(private readonly config: Configuration) {}

  public static init(config: Configuration): void {
    const provider = new XpDocumentFormattingProvider(config);

    for (const language of this.SUPPORTED_LANGUAGES) {
      config.getContext().subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider(
          { scheme: 'file', language },
          provider
        )
      );
    }
  }

  public async provideDocumentFormattingEdits(
    document: vscode.TextDocument
  ): Promise<vscode.TextEdit[]> {
    const { formatterPath, runner } = this.getFormatterExecution();
    const tempDirectory = this.config.getRandTmpSubDirectoryPath();
    await fs.promises.mkdir(tempDirectory, { recursive: true });

    const tempFilePath = path.join(
      tempDirectory,
      `${path.basename(document.fileName, path.extname(document.fileName))}.formatted${path.extname(document.fileName)}`
    );

    try {
      await fs.promises.writeFile(tempFilePath, document.getText(), 'utf-8');
      await runner.runTool(formatterPath, [tempFilePath], {
        encoding: 'utf-8',
        cwd: path.dirname(tempFilePath)
      });

      const formattedText = await fs.promises.readFile(tempFilePath, 'utf-8');
      if (formattedText === document.getText()) {
        return [];
      }

      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
      );

      Log.info(`Formatted XP document '${document.fileName}' using '${formatterPath}'.`);
      return [vscode.TextEdit.replace(fullRange, formattedText)];
    } catch (error) {
      Log.warn(`Failed to format XP document '${document.fileName}': ${error.message}`);
      throw error;
    } finally {
      await fs.promises.rm(tempDirectory, { recursive: true, force: true });
    }
  }

  private getFormatterExecution(): { formatterPath: string; runner: ToolRunner } {
    const configuredFormatterPath = this.config.getDirectFormatterExecutablePath();
    if (this.config.isLocalMacOS() && configuredFormatterPath) {
      const resolvedFormatterPath = this.config.getResolvedFormatterExecutablePath();
      if (!resolvedFormatterPath) {
        throw new XpException(
          `XP formatter was not found at '${configuredFormatterPath}'. Update xpConfig.formatterExecutablePath or clear it to fall back to Docker formatting.`
        );
      }

      return {
        formatterPath: resolvedFormatterPath,
        runner: new LocalToolRunner()
      };
    }

    const resolvedFormatterPath = this.config.getResolvedFormatterExecutablePath();
    if (!resolvedFormatterPath) {
      throw new XpException(
        this.config.shouldUseDockerToolRunner()
          ? 'XP formatter path is not configured for macOS and Docker formatter could not be resolved.'
          : 'XP formatter was not found. Install a KBT version that includes evt-xp-formatter or configure xpConfig.formatterExecutablePath.'
      );
    }

    return {
      formatterPath: resolvedFormatterPath,
      runner: this.config.getToolRunner()
    };
  }
}
