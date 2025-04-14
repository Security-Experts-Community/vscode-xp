import * as vscode from 'vscode';
import { extensions } from 'vscode';

import { API, GitExtension } from '../@types/vscode.git';
import { RuleBaseItem } from '../models/content/ruleBaseItem';
import { FileSystemHelper } from './fileSystemHelper';

export class VsCodeApiHelper {
  public static createDiagnostic(
    startLine: number,
    startOffset: number,
    endLine: number,
    endOffset: number,
    description: string
  ): vscode.Diagnostic {
    // Если файл пусто, KBT возвращает не one-based offset, а zero-based
    let startLineAfterCorrection = startLine;
    if (startLine < 0) {
      startLineAfterCorrection = 0;
    }

    let endLineAfterCorrection = endLine;
    if (endLine < 0) {
      endLineAfterCorrection = 0;
    }

    const startPosition = new vscode.Position(startLineAfterCorrection, startOffset);
    const endPosition = new vscode.Position(endLineAfterCorrection, endOffset);

    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(startPosition, endPosition),
      description
    );

    diagnostic.source = 'xp';
    return diagnostic;
  }

  public static showDifferencesBetweenTwoFiles(
    leftFileUri: vscode.Uri,
    rightFileUri: vscode.Uri,
    title?: string
  ): Thenable<unknown> {
    return vscode.commands.executeCommand('vscode.diff', leftFileUri, rightFileUri, title);
  }

  public static getDocumentRange(textEditor: vscode.TextEditor): vscode.Range {
    const firstLine = textEditor.document.lineAt(0);
    const lastLine = textEditor.document.lineAt(textEditor.document.lineCount - 1);
    return new vscode.Range(firstLine.range.start, lastLine.range.end);
  }

  public static open(fileUri: vscode.Uri): Thenable<unknown> {
    return vscode.commands.executeCommand('vscode.open', fileUri);
  }

  public static openWith(
    fileUri: vscode.Uri,
    viewId: string,
    columnOrOptions: any
  ): Thenable<unknown> {
    return vscode.commands.executeCommand('vscode.openWith', fileUri, viewId, columnOrOptions);
  }

  public static showProblemsWindow(): Thenable<unknown> {
    return vscode.commands.executeCommand('workbench.action.showErrorsWarnings');
  }

  public static openExtensionSettings(settingsPrefix: string): Thenable<unknown> {
    return vscode.commands.executeCommand('workbench.action.openSettings', settingsPrefix);
  }

  public static closeActiveEditor(): Thenable<unknown> {
    return vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  }

  public static openFolder(folderPath: string): Thenable<unknown> {
    const folderUri = vscode.Uri.file(folderPath);
    return vscode.commands.executeCommand('vscode.openFolder', folderUri);
  }

  public static openSettings(findString: string): Thenable<unknown> {
    return vscode.commands.executeCommand('workbench.action.openSettings', findString);
  }

  /**
   * Закрыть все открытые в VsCode файлы, находящиеся по указанному пути.
   * @param path путь из которого все открытые файлы должны быть закрыты.
   */
  public static async closeAllActiveEditorsIncludesPath(path: string): Promise<void> {
    for (const td of vscode.workspace.textDocuments) {
      const openFilePath = td.fileName;

      if (openFilePath.startsWith(path)) {
        // Закрываем открытый файл.
        await vscode.window.showTextDocument(td.uri, { preview: true, preserveFocus: false });
        await VsCodeApiHelper.closeActiveEditor();
      }
    }
  }

  /**
   * Сохраняет несохраненный файл открытого в VsCode правила на диск.
   * @param rule правило, код которого необходимо сохранить на диск.
   */
  public static async saveRuleCodeFile(rule: RuleBaseItem): Promise<void> {
    vscode.workspace.textDocuments.forEach(async (td) => {
      const openFilePath = td.fileName;
      if (openFilePath.toLocaleLowerCase() === rule.getRuleFilePath().toLocaleLowerCase()) {
        await td.save();
      }
    });
  }

  public static async saveTestFiles(rule: RuleBaseItem): Promise<void> {
    vscode.workspace.textDocuments.forEach(async (td) => {
      //
      if (!td.isDirty) {
        return;
      }

      if (td.isUntitled) {
        return;
      }

      const openFilePath = td.fileName.toLocaleLowerCase();
      const ruleDirectoryPath = rule.getDirectoryPath().toLocaleLowerCase();

      if (
        openFilePath.includes(ruleDirectoryPath) &&
        FileSystemHelper.isIncludeDirectoryInPath(openFilePath, RuleBaseItem.TESTS_DIRNAME)
      ) {
        await td.save();
      }
    });
  }

  public static async getGitExtension(): Promise<API | undefined> {
    try {
      const extension = extensions.getExtension<GitExtension>('vscode.git');
      if (extension == null) return undefined;

      const gitExtension = extension.isActive ? extension.exports : await extension.activate();
      return gitExtension?.getAPI(1);
    } catch {
      return undefined;
    }
  }

  public static isWorkDirectoryUsingGit(gitApi: API, workingTreePath: string): boolean {
    const kbUri = vscode.Uri.file(workingTreePath);
    if (!gitApi) {
      throw new Error('Git не уcтановлен');
    }

    // Получаем нужный репозиторий
    const repo = gitApi.getRepository(kbUri);

    // База знаний не под git-ом.
    if (!repo) {
      return false;
    }

    return true;
  }

  public static gitWorkingTreeChanges(gitApi: API, workingTreePath: string): string[] {
    const kbUri = vscode.Uri.file(workingTreePath);
    if (!gitApi) {
      throw new Error('Git не уcтановлен');
    }

    // Получаем нужный репозиторий
    const repo = gitApi.getRepository(kbUri);

    // База знаний не под git-ом.
    if (!repo) {
      throw new Error('Для контента не создан репозиторий');
    }

    const changePaths = repo.state.workingTreeChanges.map((c) => {
      return c.uri.fsPath.toLocaleLowerCase();
    });

    return changePaths;
  }
}
