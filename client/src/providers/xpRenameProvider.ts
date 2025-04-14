import * as vscode from 'vscode';

import { XpException } from '../models/xpException';

export class XpRenameProvide implements vscode.RenameProvider {
  provideRenameEdits(
    document: vscode.TextDocument,
    position: vscode.Position,
    newName: string,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.WorkspaceEdit> {
    throw new XpException('Скоро мы будем уметь переименовывать все и вся ;) Stay tuned!');
  }
  prepareRename?(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Range | { range: vscode.Range; placeholder: string }> {
    throw new XpException('Скоро мы будем уметь переименовывать все и вся ;) Stay tuned!');
  }
}
