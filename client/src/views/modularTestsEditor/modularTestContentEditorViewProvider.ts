import * as fs from 'fs';
import * as vscode from 'vscode';

import { CorrelationUnitTest } from '../../models/tests/correlationUnitTest';
import { Configuration } from '../../models/configuration';

export class ModularTestContentEditorViewProvider  {

	public static readonly viewId = 'ModularTestContentEditorView';

	public static readonly showEditorCommand = "ModularTestContentEditorView.showEditor";
	public static readonly onTestSelectionChangeCommand = "ModularTestContentEditorView.onTestSelectionChange";

	public static init(context: vscode.ExtensionContext) {

		// Открытие кода теста по нажатию на его номер.
		context.subscriptions.push(
			vscode.commands.registerCommand(
				ModularTestContentEditorViewProvider.showEditorCommand, 
				async (test: CorrelationUnitTest) => {
					const testPath = test.getTestPath();
					if (!fs.existsSync(testPath)) {
						vscode.window.showWarningMessage(`Не удалось открыть тест по пути '${testPath}'`);
						return;
					}

					const testUri = vscode.Uri.file(testPath);
					const testDocument = await vscode.workspace.openTextDocument(testUri);
					await vscode.window.showTextDocument(testDocument);
				}
			)
		);	

		context.subscriptions.push(
			vscode.commands.registerCommand(
				ModularTestContentEditorViewProvider.onTestSelectionChangeCommand, 
				async (test: CorrelationUnitTest) => {
					// Открываем код теста.
					vscode.commands.executeCommand(ModularTestContentEditorViewProvider.showEditorCommand, test);

					// Показываем вывод теста, если он есть.
					const testOutput = test.getOutput();
					if(!testOutput) {
						return;
					}

					const outputChannel = Configuration.get().getOutputChannel();
					outputChannel.clear();
					outputChannel.append(testOutput);
				}
			)
		);
	}
}