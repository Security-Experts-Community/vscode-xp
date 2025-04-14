import * as vscode from 'vscode';

export class XpReferenceProvider implements vscode.ReferenceProvider {
  public provideReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
    options: { includeDeclaration: boolean },
    token: vscode.CancellationToken
  ): Thenable<vscode.Location[]> {
    return Promise.resolve([
      new vscode.Location(
        document.uri,
        new vscode.Range(new vscode.Position(3, 1), new vscode.Position(3, 4))
      ),
      new vscode.Location(
        document.uri,
        new vscode.Range(new vscode.Position(6, 1), new vscode.Position(6, 4))
      )
    ]);
  }
}
