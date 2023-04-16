import * as vscode from 'vscode';
import { ExtensionHelper } from '../helpers/extensionHelper';
import { TestHelper } from '../helpers/testHelper';
import { VsCodeApiHelper } from '../helpers/vsCodeApiHelper';

export class TestsFormatContentMenuExtension {

	public static init(context : vscode.ExtensionContext) {
		// Упаковка тестов перед сохранением.
		vscode.workspace.onWillSaveTextDocument(
			async (e: vscode.TextDocumentWillSaveEvent) => {
				
				const document = e.document;
				if (document.languageId != 'test')
					return;

				const activeEditor = vscode.window.activeTextEditor;
				const currDocument = activeEditor?.document;
				if (!currDocument) {
					await vscode.window.showInformationMessage("Документ для форматирования не открыт.");
					return;
				}

				try {
					const testCode = currDocument.getText();
					const compressedTestCode = TestHelper.compressTestCode(testCode);

					// Заменяем текущий код на отформатированный.
					const documentRange = VsCodeApiHelper.getDocumentRange(activeEditor);
					activeEditor.edit(editBuilder => {
						editBuilder.replace(documentRange, compressedTestCode);
					});
				}
				catch (error) {
					ExtensionHelper.showError("Ошибка упаковки кода теста.", error.message);
				}
			}
		);

		// Форматирование кода тестов при запросе форматирования.
		const formater = vscode.languages.registerDocumentFormattingEditProvider('test', {
			provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {

				const originalTestCode = document.getText();
				const formattedTestCode = TestHelper.formatTestCodeAndEvents(originalTestCode);
				const activeEditor = vscode.window.activeTextEditor;
				if (!activeEditor) {
					return [];
				}

				const documentRage = VsCodeApiHelper.getDocumentRange(activeEditor);
				return [vscode.TextEdit.replace(documentRage, formattedTestCode)];
			}
		});
		context.subscriptions.push(formater);

		// Форматирование кода теста для выделенного участка.
		const rangeFormatter = vscode.languages.registerDocumentRangeFormattingEditProvider('test', {
			provideDocumentRangeFormattingEdits: (document, range, options) => {
				const originalTestCode = document.getText(range);
				const formattedTestCode = TestHelper.formatTestCodeAndEvents(originalTestCode);

				return [vscode.TextEdit.replace(range, formattedTestCode)];
			}
		});
		context.subscriptions.push(rangeFormatter);

		// Ручное или автоматическое обновление дерева контента
		const compressTest = vscode.commands.registerCommand(
			'NativeEditorContextMenu.compressTest',
			async (document: vscode.TextDocument ) =>  {

				const activeEditor = vscode.window.activeTextEditor;
				const currDocument = activeEditor?.document;
				if (!currDocument) {
					await vscode.window.showInformationMessage("Документ для форматирования не открыт.");
					return;
				}

				try {
					const testCode = currDocument.getText();
					const compressedTestCode = TestHelper.compressTestCode(testCode);

					// Заменяем текущий код на отформатированный.
					const documentRange = VsCodeApiHelper.getDocumentRange(activeEditor);
					activeEditor.edit(editBuilder => {
						editBuilder.replace(documentRange, compressedTestCode);
					});
				}
				catch (error) {
					ExtensionHelper.showError("Ошибка упаковки кода теста. ", error.message);
				}
			},
			this
		);

		context.subscriptions.push(compressTest);
	}
}