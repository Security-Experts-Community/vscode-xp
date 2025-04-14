import * as vscode from 'vscode';

export interface PackAction {
  run(packagePath: string, emitter: vscode.EventEmitter<string>): Promise<void>;
}
