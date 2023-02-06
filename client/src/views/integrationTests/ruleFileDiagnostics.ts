import * as vscode  from 'vscode';

export class RuleFileDiagnostics {
	public Uri : vscode.Uri;
	public Diagnostics : vscode.Diagnostic[] = [];
}