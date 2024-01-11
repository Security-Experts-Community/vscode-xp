import * as vscode from 'vscode';

import { DialogHelper } from '../../helpers/dialogHelper';
import { Configuration } from '../../models/configuration';
import { RuleBaseItem } from '../../models/content/ruleBaseItem';
import { VsCodeApiHelper } from '../../helpers/vsCodeApiHelper';
import { ContentTreeProvider } from '../contentTree/contentTreeProvider';
import { TestStatus } from '../../models/tests/testStatus';
import { BaseUnitTest } from '../../models/tests/baseUnitTest';
import { Table } from '../../models/content/table';
import { Macros } from '../../models/content/macros';
import { Correlation } from '../../models/content/correlation';
import { Normalization } from '../../models/content/normalization';
import { Log } from '../../extension';

/**
 * Список тестов в отдельной вьюшке.
 */
export class UnitTestsListViewProvider implements vscode.TreeDataProvider<BaseUnitTest> {

	private _onDidChangeTreeData: vscode.EventEmitter<BaseUnitTest | undefined | void> = new vscode.EventEmitter<BaseUnitTest | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<BaseUnitTest | undefined | void> = this._onDidChangeTreeData.event;

	private static _rule: RuleBaseItem;

	public static readonly viewId = 'ModularTestsListView';
	
	public static readonly refreshCommand = "ModularTestsListView.refresh";
	public static readonly reloadAndRefreshCommand = "ModularTestsListView.reloadAndRefresh";
	public static readonly setRuleCommand = "ModularTestsListView.setRule";

	public static readonly runTestsCommand = "ModularTestsListView.runTests";
	public static readonly addTestCommand = "ModularTestsListView.addTest";
	public static readonly removeTestCommand = "ModularTestsListView.removeTest";

	private static isRule(item: RuleBaseItem | Table | Macros) : item is RuleBaseItem {
		return (item as RuleBaseItem).createNewUnitTest !== undefined;
	}

	public static init(config: Configuration) : UnitTestsListViewProvider {

		const testsListViewProvider = new UnitTestsListViewProvider(config);

		const testsListView = vscode.window.createTreeView(
			UnitTestsListViewProvider.viewId, {
			treeDataProvider: testsListViewProvider
		});

		config.getContext().subscriptions.push(
			vscode.commands.registerCommand(
				UnitTestsListViewProvider.setRuleCommand, 
				(rule: RuleBaseItem) => { 
					this._rule = rule; 
				}
			)
		);

		config.getContext().subscriptions.push(
			vscode.commands.registerCommand(
				UnitTestsListViewProvider.refreshCommand, 
				(rule: RuleBaseItem) => { 
					testsListViewProvider.refresh(); 
				}
			)
		);

		config.getContext().subscriptions.push(
			vscode.commands.registerCommand(
				UnitTestsListViewProvider.reloadAndRefreshCommand, 
				() => { 
					const selectedRule = ContentTreeProvider.getSelectedItem();
					if(selectedRule instanceof Correlation || selectedRule instanceof Normalization) {
						selectedRule.reloadUnitTests();
						testsListViewProvider.refresh(); 
					}
				}
			)
		);	

		// Запустить все тесты.
		config.getContext().subscriptions.push(
			vscode.commands.registerCommand(
				UnitTestsListViewProvider.runTestsCommand, 
				async () => { 
					
					const selectedRule = ContentTreeProvider.getSelectedItem();

					// TODO: Сделать тесты для случая, когда выбрана папка.
					// По-хорошему нужно сохранять все открытые документы 
					// если запускам сборку всех графов
					if (UnitTestsListViewProvider.isRule(selectedRule)){
						await VsCodeApiHelper.saveRuleCodeFile(selectedRule);
						await VsCodeApiHelper.saveTestFiles(selectedRule);
					}
					
					await testsListViewProvider.runTests(selectedRule); 
					// Обновляем статус тестов.
					await vscode.commands.executeCommand(UnitTestsListViewProvider.refreshCommand);
				}
			)
		);

		config.getContext().subscriptions.push(
			vscode.commands.registerCommand(
				UnitTestsListViewProvider.addTestCommand, 
				async () => { 
					const selectedRule = ContentTreeProvider.getSelectedItem();
					// TODO: Сделать тесты для случая, когда выбрана папка.
					// По-хорошему нужно сохранять все открытые документы 
					// если запускам сборку всех графов
					if (UnitTestsListViewProvider.isRule(selectedRule)){
						// Добавили новый юнит-тесты.
						selectedRule.addNewUnitTest();
						await selectedRule.saveUnitTests();
					}
					// Обновили вьюшку.
					testsListViewProvider.refresh();
				}
			)
		);

		config.getContext().subscriptions.push(
			vscode.commands.registerCommand(
				UnitTestsListViewProvider.removeTestCommand, 
				async (test : BaseUnitTest) => { 
					// Сохраним все несохраненные файлы, так как будем сдвигать их содержимое
					// если удаляются тесты с начала
					await vscode.workspace.saveAll(false);
					const selectedRule = ContentTreeProvider.getSelectedItem();

					// TODO: Сделать тесты для случая, когда выбрана папка.
					// По-хорошему нужно сохранять все открытые документы 
					// если запускам сборку всех графов
					if (UnitTestsListViewProvider.isRule(selectedRule)){
						// Перечитываем тесты с диска после сохранения.
						selectedRule.reloadUnitTests();
						
						// Удаляем выделенный тест.
						const tests = selectedRule.getUnitTests();
						const index = test.getNumber() - 1;
						if (!tests?.[index]) { 
							DialogHelper.showError(`Не удалось найти тест ${test.getNumber()}`);
							return;
						}
						tests.splice(index, 1);

						// Обновляем и сохраняем.
						selectedRule.setUnitTests(tests);
						selectedRule.saveUnitTests();
					}
					testsListViewProvider.refresh();
				}
			)
		);

		return testsListViewProvider;
	}

	private constructor(private _config : Configuration) {
	}

	public async runTests(rule: RuleBaseItem | Table | Macros) : Promise<void> {

		const tests = await this.getChildren();

		// Сбрасываем результаты предыдущих тестов.
		tests.forEach(t => t.setStatus(TestStatus.Unknown));
		const testHandler = async (unitTest : BaseUnitTest) => {
			const rule = unitTest.getRule();
			const testRunner = rule.getUnitTestRunner();
			return testRunner.run(unitTest);
		};

		return vscode.window.withProgress<void>({
			location: vscode.ProgressLocation.Notification,
			cancellable: false,
		}, async (progress) => {
			progress.report( {message : `Выполняются модульные тесты правила ${rule.getName()}`});
			for (const test of tests) {
				try {
					await testHandler(test);
				}
				catch(error) {
					test.setStatus(TestStatus.Failed);
					Log.error(error);
				} 
				finally {
					await vscode.commands.executeCommand(UnitTestsListViewProvider.refreshCommand);
				}
			}
		});
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: BaseUnitTest): vscode.TreeItem {
		return element;
	}

	getChildren(element?: BaseUnitTest): Thenable<(BaseUnitTest)[]> {
		const selectedRule = ContentTreeProvider.getSelectedItem();

		if(!selectedRule) {
			return Promise.resolve([]);
		}

		// TODO: Сделать тесты для случая, когда выбрана папка.
		// По-хорошему нужно сохранять все открытые документы 
		// если запускам сборку всех графов
		if (UnitTestsListViewProvider.isRule(selectedRule)){
			const tests = selectedRule.getUnitTests();
			return Promise.resolve(tests);
		}
		return Promise.resolve([]);
	}
}
