import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { ExtensionHelper } from '../../helpers/extensionHelper';
import { Configuration } from '../../models/configuration';
import { RuleBaseItem } from '../../models/content/ruleBaseItem';
import { VsCodeApiHelper } from '../../helpers/vsCodeApiHelper';
import { ContentTreeProvider } from '../contentTree/contentTreeProvider';
import { TestStatus } from '../../models/tests/testStatus';
import { BaseUnitTest } from '../../models/tests/baseUnitTest';
import { Table } from '../../models/content/table';
import { Macros } from '../../models/content/macros';
import { SiemjManager } from '../../models/siemj/siemjManager';

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

		const outputChannel = Configuration.get().getOutputChannel();
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
				(rule: RuleBaseItem) => { 
					rule.reloadUnitTests();
					testsListViewProvider.refresh(); 
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
					
					await testsListViewProvider.runTests(); 
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
							ExtensionHelper.showUserError(`Не удалось найти тест ${test.getNumber()}`);
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

	public async runTests() {

		// Очищаем предыдущий вывод и показываем окно вывода.
		this._config.getOutputChannel().clear();
		this._config.getOutputChannel().show();
		
		const tests = await this.getChildren();

		// Сбрасываем результаты предыдущих тестов.
		tests.forEach(t => t.setStatus(TestStatus.Unknown));
		const testHandler = (unitTest : BaseUnitTest) => {
			const rule = unitTest.getRule();
			const testRunner = rule.getUnitTestRunner();
			return testRunner.run(unitTest).then( 
				async () => {
					await vscode.commands.executeCommand(UnitTestsListViewProvider.refreshCommand);
				}
			);
		};

		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: false,
		}, async (progress) => {
			// Схема БД необходима для запуска юнит-тестов.
			const rule = tests[0].getRule();
			const root = this._config.getRootByPath(rule.getDirectoryPath());
			const rootFolder = path.basename(root);
			const schemaFullPath = this._config.getSchemaFullPath(rootFolder);

			if(!fs.existsSync(schemaFullPath)) {
				progress.report( {message : "Сборка схемы БД, которая необходима для запуска тестов."});
				const siemjManager = new SiemjManager(this._config);
				await siemjManager.buildSchema(rule);
			}

			progress.report( {message : `Выполняются модульные тесты`});
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
