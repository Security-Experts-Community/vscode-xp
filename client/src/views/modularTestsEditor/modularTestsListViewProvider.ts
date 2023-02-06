import * as vscode from 'vscode';
import * as path from 'path';

import { CorrelationUnitTest } from '../../models/tests/correlationUnitTest';
import { UnitTestsRunner } from '../../models/tests/unitTestsRunner';
import { ExtensionHelper } from '../../helpers/extensionHelper';
import { Configuration } from '../../models/configuration';
import { RuleBaseItem } from '../../models/content/ruleBaseItem';
import { VsCodeApiHelper } from '../../helpers/vsCodeApiHelper';
import { ContentTreeProvider } from '../contentTree/contentTreeProvider';
import { TestStatus } from '../../models/tests/testStatus';
import { ModuleTestOutputParser } from './modularTestOutputParser';

/**
 * Список тестов в отдельной вьюшке.
 */
export class ModularTestsListViewProvider implements vscode.TreeDataProvider<CorrelationUnitTest> {

	private _onDidChangeTreeData: vscode.EventEmitter<CorrelationUnitTest | undefined | void> = new vscode.EventEmitter<CorrelationUnitTest | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<CorrelationUnitTest | undefined | void> = this._onDidChangeTreeData.event;

	public static readonly viewId = 'ModularTestsListView';
	
	public static readonly refreshCommand = "ModularTestsListView.refresh";
	public static readonly reloadAndRefreshCommand = "ModularTestsListView.reloadAndRefresh";
	
	public static readonly runTestsCommand = "ModularTestsListView.runTests";
	public static readonly addTestCommand = "ModularTestsListView.addTest";
	public static readonly removeTestCommand = "ModularTestsListView.removeTest";

	public static init(config: Configuration) : ModularTestsListViewProvider {

		const outputChannel = Configuration.get().getOutputChannel();
		const testsListViewProvider = new ModularTestsListViewProvider(config);

		const testsListView = vscode.window.createTreeView(
			ModularTestsListViewProvider.viewId, {
			treeDataProvider: testsListViewProvider
		});

		config.getContext().subscriptions.push(
			vscode.commands.registerCommand(
				ModularTestsListViewProvider.refreshCommand, 
				(rule: RuleBaseItem) => { 
					testsListViewProvider.refresh(); 
				}
			)
		);

		config.getContext().subscriptions.push(
			vscode.commands.registerCommand(
				ModularTestsListViewProvider.reloadAndRefreshCommand, 
				(rule: RuleBaseItem) => { 
					rule.reloadModularTests();
					testsListViewProvider.refresh(); 
				}
			)
		);	

		// Запустить все тесты.
		config.getContext().subscriptions.push(
			vscode.commands.registerCommand(
				ModularTestsListViewProvider.runTestsCommand, 
				async () => { 
					
					const selectedRule = ContentTreeProvider.getSelectedItem();
					await VsCodeApiHelper.saveRuleCodeFile(selectedRule);
					await VsCodeApiHelper.saveTestFiles(selectedRule);
					
					await testsListViewProvider.runTests(); 
					// Обновляем статус тестов.
					await vscode.commands.executeCommand(ModularTestsListViewProvider.refreshCommand);
				}
			)
		);

		config.getContext().subscriptions.push(
			vscode.commands.registerCommand(
				ModularTestsListViewProvider.addTestCommand, 
				async () => { 
					const selectedRule = ContentTreeProvider.getSelectedItem();
					const ruleFullPath = selectedRule.getDirectoryPath();

					// Добавили новый юнит-тесты.
					const newTest = CorrelationUnitTest.create(ruleFullPath, selectedRule);
					selectedRule.addModularTests([newTest]);
					await selectedRule.saveModularTests();

					// Обновили вьюшку.
					testsListViewProvider.refresh();
				}
			)
		);

		config.getContext().subscriptions.push(
			vscode.commands.registerCommand(
				ModularTestsListViewProvider.removeTestCommand, 
				async (test : CorrelationUnitTest) => { 
					// Сохраним все несохраненные файлы, так как будем сдвигать их содержимое
					// если удаляются тесты с начала
					await vscode.workspace.saveAll(false);
					const selectedRule = ContentTreeProvider.getSelectedItem();
					
					// Перечитываем тесты с диска после сохранения.
					selectedRule.reloadModularTests();
					
					// Удаляем выделенный тест.
					const tests = selectedRule.getModularTests();
					const index = test.getNumber() - 1;
					if (!tests?.[index]) { 
						ExtensionHelper.showUserError(`Не удалось найти тест ${test.getNumber()}`);
						return;
					}
					tests.splice(index, 1);

					// Обновляем и сохраняем.
					selectedRule.setModularTests(tests);
					selectedRule.saveModularTests();

					testsListViewProvider.refresh();
				}
			)
		);

		return testsListViewProvider;
	}

	private constructor(private _config : Configuration) {
	}

	public async runTests() {

		// Очищаем предыдущий вывод и показываем окно вывода.
		this._config.getOutputChannel().clear();
		this._config.getOutputChannel().show();
		
		const tests = await this.getChildren();

		// Сбрасываем результаты предыдущих тестов.
		tests.forEach(t => t.setStatus(TestStatus.Unknown));

		const config = Configuration.get();
		const parse = new ModuleTestOutputParser();
		const testRunner = new UnitTestsRunner(config, parse);
		const testHandler = (t : CorrelationUnitTest) => {
			return testRunner.run(t).then( 
				async (t) => {
					await vscode.commands.executeCommand(ModularTestsListViewProvider.refreshCommand);
				}
			);
		};

		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: false,
			title: `Выполняются модульные тесты`
		}, async (progress) => {
			await tests.reduce(
				(p, t) => 
					p.then(_ => testHandler(t)),
					Promise.resolve()
			);
		});
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: CorrelationUnitTest): vscode.TreeItem {
		return element;
	}

	getChildren(element?: CorrelationUnitTest): Thenable<(CorrelationUnitTest)[]> {
		const selectedRule = ContentTreeProvider.getSelectedItem();

		if(!selectedRule) {
			return Promise.resolve([]);
		}

		const tests = selectedRule.getModularTests();
		return Promise.resolve(tests);
	}
}


