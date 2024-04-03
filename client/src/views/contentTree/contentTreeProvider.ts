import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { DialogHelper } from '../../helpers/dialogHelper';
import { Correlation } from '../../models/content/correlation';
import { ContentFolder, ContentFolderType } from '../../models/content/contentFolder';
import { Enrichment } from '../../models/content/enrichment';
import { Table } from '../../models/content/table';
import { Normalization } from '../../models/content/normalization';
import { Aggregation } from '../../models/content/aggregation';
import { Macros } from '../../models/content/macros';
import { RuleBaseItem } from '../../models/content/ruleBaseItem';
import { VsCodeApiHelper } from '../../helpers/vsCodeApiHelper';
import { API, APIState } from '../../@types/vscode.git';
import { Configuration } from '../../models/configuration';
import { OpenKnowledgebaseCommand } from './commands/openKnowledgebaseCommand';
import { UnitTestsListViewProvider } from '../unitTestEditor/unitTestsListViewProvider';
import { CreateRuleViewProvider } from '../createRule/createRuleViewProvider';
import { CreateSubFolderCommand } from './commands/createSubFolderCommand';
import { RenameTreeItemCommand } from './commands/renameTreeItemCommand';
import { DeleteContentItemCommand } from './commands/deleteContentItemCommand';
import { CreatePackageCommand } from './commands/createPackageCommand';
import { SiemJOutputParser } from '../../models/siemj/siemJOutputParser';
import { BuildAllGraphsAndTableListsCommand } from './commands/buildAllGraphsAndTableListsCommand';
import { UnpackKbCommand } from './commands/unpackKbCommand';
import { ContentType } from '../../contentType/contentType';
import { SetContentTypeCommand } from '../../contentType/setContentTypeCommand';
import { GitHooks } from './gitHooks';
import { InitKBRootCommand } from './commands/initKnowledgebaseRootCommand';
import { ExceptionHelper } from '../../helpers/exceptionHelper';
import { ContentTreeBaseItem } from '../../models/content/contentTreeBaseItem';
import { ContentVerifierCommand } from './commands/contentVerifierCommand';
import { BuildLocalizationsCommand } from './commands/buildLocalizationsCommand';
import { BuildWldCommand } from './commands/buildWldCommand';
import { BuildNormalizationsCommand } from './commands/buildNormalizationsCommand';
import { DuplicateTreeItemCommand } from './commands/duplicateTreeItemCommand';
import { CreateMacroCommand } from './commands/createMacrosCommand';
import { PackKbCommand } from './commands/packKbCommand';
import { OpenTableCommand } from './commands/openTableCommand';
import { LocalizationEditorViewProvider } from '../localization/localizationEditorViewProvider';
import { CommandHelper } from '../../helpers/commandHelper';
import { SortHelper } from '../../helpers/sortHelper';
import { OpenTableDefaultsCommand } from './commands/openTableDefaultValuesCommand';

export class ContentTreeProvider implements vscode.TreeDataProvider<ContentTreeBaseItem> {

	static async init(
		config: Configuration,
		knowledgebaseDirectoryPath: string) : Promise<void> {

		const context = config.getContext();
		const gitApi = await VsCodeApiHelper.getGitExtension();

		const contentTreeProvider = new ContentTreeProvider(knowledgebaseDirectoryPath, gitApi, config);

		const contentTree = vscode.window.createTreeView(
			ContentTreeProvider.KnowledgebaseTreeId, {
				treeDataProvider: contentTreeProvider,
			}
		);

		if(gitApi) {
			// Обновляем дерево при смене текущей ветки.
			const gitHooks = new GitHooks(gitApi, config);
			gitApi.onDidOpenRepository( (r) => {
				r.state.onDidChange( (e) => {
					gitHooks.update();
				});
			});

			gitApi.onDidChangeState( (e: APIState) => {
				gitHooks.update();
			});
		} else {
			DialogHelper.showWarning(`Наличие системы контроля версии [git](https://git-scm.com/) необходимо для эффективной работы расширения. Требования можно посмотреть [здесь](https://vscode-xp.readthedocs.io/ru/latest/gstarted.html#id3)`);
		}


		// Ручное или автоматическое обновление дерева контента
		vscode.commands.registerCommand(
			ContentTreeProvider.refreshTreeCommand,
			async () => {
				contentTreeProvider.refresh();
			}
		);

		vscode.commands.registerCommand(
			ContentTreeProvider.refreshItemCommand,
			async (item: ContentTreeBaseItem) => {
				contentTreeProvider.refresh(item);
			}
		);

		context.subscriptions.push(
			vscode.commands.registerCommand(
				ContentTreeProvider.verifyFolderCommand,
				async (item: ContentTreeBaseItem) => {
					const command = new ContentVerifierCommand(config, item);
					await CommandHelper.singleExecutionCommand(command);
				}
			)
		);
	
		
		context.subscriptions.push(
			vscode.commands.registerCommand(
				ContentTreeProvider.openKnowledgebaseCommand,
				() => {
					const command = new OpenKnowledgebaseCommand(config);
					command.execute(); 
				}
			)
		);
		
		// Изменение выбора правила с открытием визуализации нужных данных.
		vscode.commands.registerCommand(
			ContentTreeProvider.onRuleClickCommand,
			async (item: RuleBaseItem|Table|Macros) : Promise<boolean> => {
	
				try {
					// Открываем код правила.
					const ruleFilePath = item.getFilePath();
	
					if (ruleFilePath && !fs.existsSync(ruleFilePath)) {
						// Попытка открыть несуществующий item
						// Возможно при переключении веток репозитория или ручной модификации репозитория.
						ContentTreeProvider.setSelectedItem(null);
						await vscode.commands.executeCommand(UnitTestsListViewProvider.refreshCommand);
	
						contentTreeProvider.refresh();
						return false;
					} 
	
					ContentTreeProvider.setSelectedItem(item);

					// Открываем код правила
					if(ruleFilePath) {
						const elementUri = vscode.Uri.file(ruleFilePath);
						const contentDocument = await vscode.workspace.openTextDocument(elementUri);
						await vscode.window.showTextDocument(contentDocument, vscode.ViewColumn.One);
						await vscode.commands.executeCommand(UnitTestsListViewProvider.refreshCommand);
					}
				}
				catch(error) {
					ExceptionHelper.show(error, `Ошибка во время обработки файла ${item.getFilePath()}`);
					return false;
				}
	
				return true;
			}
		);

		vscode.commands.registerCommand(
			ContentTreeProvider.onTableClickCommand,
			async (table: Table) : Promise<boolean> => {
				const command = new OpenTableCommand(config, table);
				command.execute();
				return true;
			}
		);
	
		// Форма создания правил.
		await CreateRuleViewProvider.init(config);
		
		// Создание поддиректории.
		context.subscriptions.push(
			vscode.commands.registerCommand(
				ContentTreeProvider.createSubFolderCommand,
				async (item: RuleBaseItem) => {
					const command = new CreateSubFolderCommand(config, item);
					command.execute();
				},
				this
			)
		);

		// Создание макроса
		context.subscriptions.push(
			vscode.commands.registerCommand(
				ContentTreeProvider.createMacroCommand,
				async (item: RuleBaseItem) => {
					const command = new CreateMacroCommand(config, item);
					command.execute();
				},
				this
			)
		);
	
		// Переименование правила.
		context.subscriptions.push(
			vscode.commands.registerCommand(
				ContentTreeProvider.renameItemCommand,
				async (item: RuleBaseItem) => {
					const command = new RenameTreeItemCommand(config, item);
					command.execute();
				},
				this
			)
		);

		// Дублирование правила.
		context.subscriptions.push(
			vscode.commands.registerCommand(
				ContentTreeProvider.duplicateTreeItemCommand,
				async (item: RuleBaseItem) => {
					const command = new DuplicateTreeItemCommand(config, item);
					command.execute();
				},
				this
			)
		);
	
		// Удаление сущности.
		context.subscriptions.push(
			vscode.commands.registerCommand(
				ContentTreeProvider.deleteItemCommand,
				async (item: RuleBaseItem) => {
					const command = new DeleteContentItemCommand(config, item);
					command.execute();
				},
				this
			)
		);
	
		// Удаление пакета.
		context.subscriptions.push(
			vscode.commands.registerCommand(
				ContentTreeProvider.createPackageCommand,
				async (item: RuleBaseItem) => {
					const command = new CreatePackageCommand(config, item);
					command.execute();
				},
				this
			)
		);

		context.subscriptions.push(
			vscode.commands.registerCommand(
				ContentTreeProvider.unpackKbPackageCommand,
				async (selectedItem: RuleBaseItem) => {
	
					const config = Configuration.get();
					if(!config.isKbOpened()) {
						return DialogHelper.showInfo("Для распаковки KB-пакета нужно открыть базу знаний");
					}
					
					const command = new UnpackKbCommand(config, selectedItem);
					await CommandHelper.singleExecutionCommand(command, `Неожиданная ошибка распаковки kb-пакета`);
				}
			)
		);
	
		context.subscriptions.push(
			vscode.commands.registerCommand(
				ContentTreeProvider.buildAllCommand,
				async () => {
					const parser = new SiemJOutputParser();
					const command = new BuildAllGraphsAndTableListsCommand(config, parser);
					await CommandHelper.singleExecutionCommand(command);
				}
			)
		);

		context.subscriptions.push(
			vscode.commands.registerCommand(
				ContentTreeProvider.buildLocalizationsCommand,
				async () => {
					const parser = new SiemJOutputParser();
					const command = new BuildLocalizationsCommand(config, parser);
					await CommandHelper.singleExecutionCommand(command);
				}
			)
		);

		context.subscriptions.push(
			vscode.commands.registerCommand(
				ContentTreeProvider.buildNormalizationsCommand,
				async () => {
					const parser = new SiemJOutputParser();
					const command = new BuildNormalizationsCommand(config, parser);
					await CommandHelper.singleExecutionCommand(command);
				}
			)
		);

		context.subscriptions.push(
			vscode.commands.registerCommand(
				ContentTreeProvider.buildWldCommand,
				async () => {
					const parser = new SiemJOutputParser();
					const command = new BuildWldCommand(config, parser);
					await CommandHelper.singleExecutionCommand(command);
				}
			)
		);
		
		context.subscriptions.push(
			vscode.commands.registerCommand(
				ContentTreeProvider.buildKbPackageCommand,
				async (selectedPackage: RuleBaseItem) => {
					if(!config.isKbOpened()) {
						DialogHelper.showInfo("Для сбора графов нужно открыть базу знаний");
						return;
					}
					
					// Выбираем директорию для выгрузки пакета.
					const packageName = selectedPackage.getName();
					const fileInfos = await vscode.window.showSaveDialog({
					filters: {'Knowledge base (*.kb)' : ['kb']},
						defaultUri: vscode.Uri.file(packageName)
					});

					if(!fileInfos) {
						DialogHelper.showError(config.getMessage("No path selected"));
						return;
					}

					const unpackKbFilePath = fileInfos.fsPath; 
					const packCommand = new PackKbCommand(config, selectedPackage, unpackKbFilePath);
					await packCommand.execute();
				}
			)
		);

		context.subscriptions.push(
			vscode.commands.registerCommand(
				ContentTreeProvider.showTableDefaultsCommand,
				async (table: Table) => {
					const command = new OpenTableDefaultsCommand(config, table);
					command.execute();
				}
			)
		);

		// Связка перехвата двух событий ниже позволяет организовать синхронизацию работы в Explorer и дереве контента.
		// Если дерево открыто, то при переключении вкладок меняем выделенное правило в дереве.
		// Если дерева не видно, тогда сохраняем редактор в переменную.
		context.subscriptions.push(
			vscode.window.onDidChangeActiveTextEditor(
				async (te: vscode.TextEditor) => {
					if(contentTree.visible && te) {
						return ContentTreeProvider.showRuleTreeItem(contentTree, te.document.fileName);
					}

					// Почему-то проскакивает undefined.
					if(te) {
						ContentTreeProvider.selectedFilePath = te.document.fileName;
					}
				}
			)
		);

		// Дерево снова видно, значит на основе сохраненного выше редактора показываем нужный узел в дереве контента.
		context.subscriptions.push(
			contentTree.onDidChangeVisibility(
				async (e: vscode.TreeViewVisibilityChangeEvent) => {
					if(e.visible) {
						// Если ранее уже был выбран файл.
						if(ContentTreeProvider.selectedFilePath) {
							return ContentTreeProvider.showRuleTreeItem(contentTree, ContentTreeProvider.selectedFilePath);
						}

						// Если файл раньше выбран не был, но был открыт при запуске vsCode.
						if(vscode.window.activeTextEditor && vscode.window.activeTextEditor.document) {
							const activeDocumentPath = vscode.window.activeTextEditor.document.fileName;
							return ContentTreeProvider.showRuleTreeItem(contentTree, activeDocumentPath);
						}
					}
				}
			)
		);

		context.subscriptions.push(
			contentTree.onDidChangeSelection(
				async (e: vscode.TreeViewSelectionChangeEvent<ContentTreeBaseItem>) => {
					if(e.selection && e.selection.length == 1) {
						const selectedItem = e.selection[0];
						// Вызываем команду отображения выбранного элемента дерева.
						// Для правил это открытие файла, для табличного списка - редактора его структуры.
						const selectedItemCommand = selectedItem?.command?.command;
						if(selectedItemCommand) {
							vscode.commands.executeCommand(selectedItemCommand, selectedItem);
						}
					}
				}
			)
		);
		//
	}

	public static selectedFilePath: string;

	private static async showRuleTreeItem(kbTree: vscode.TreeView<ContentTreeBaseItem>, filePath: string) : Promise<void>{
		if(!filePath) {
			return;
		}

		const ruleDirectoryPath = FileSystemHelper.ruleFilePathToDirectory(filePath);
		if(!ruleDirectoryPath) {
			return;
		}

		const rule = await ContentTreeProvider.createContentElement(ruleDirectoryPath);
		// Директории не выделяем в дереве контента
		if(rule.isFolder()) {
			return;
		}

		return kbTree.reveal(rule,
		{
			focus: true,
			expand: false,
			select: true
		});
	}

	constructor(private _knowledgebaseDirectoryPath: string | undefined, _gitAPI : API, private _config: Configuration) {
		this._gitAPI = _gitAPI;
	}

	refresh(item?: ContentTreeBaseItem): void {
		if(item) {
			this._onDidChangeTreeData.fire(item);
		} else {
			this._onDidChangeTreeData.fire(undefined);
		}
	}

	getTreeItem(element: ContentTreeBaseItem|RuleBaseItem): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: ContentTreeBaseItem|RuleBaseItem): Promise<ContentTreeBaseItem[]> {

		if (!this._knowledgebaseDirectoryPath) {
			return Promise.resolve([]);
		}

		if(!element) {
			// Проверка наличия workspace.
			if(!this._knowledgebaseDirectoryPath) {
				return Promise.resolve([]);
			}

			const subDirectories = FileSystemHelper.readSubDirectoryNames(this._knowledgebaseDirectoryPath);
			this.initializeRootIfNeeded(subDirectories);

			// В случае штатной директории пакетов будет возможности создавать и собирать пакеты.
			const dirName = path.basename(this._knowledgebaseDirectoryPath);
			if (this.isContentRoot(dirName)){
				const packagesFolder = await ContentFolder.create(this._knowledgebaseDirectoryPath, ContentFolderType.ContentRoot);
				return [packagesFolder];
			}

			const packagesFolder = await ContentFolder.create(this._knowledgebaseDirectoryPath, ContentFolderType.KbRoot);
			return [packagesFolder];
		}

		// Получаем список поддиректорий.
		const subFolderPath = element.getDirectoryPath();
		const childrenItems : (ContentTreeBaseItem)[]= [];

		const subDirectories = FileSystemHelper.readSubDirectoryNames(subFolderPath);
		this.notifyIfContentTypeIsSelectedIncorrectly(subDirectories);

		for(const dirName of subDirectories)
		{
			// .git, .vscode и т.д.
			// _meta штатная директория в каждом пакете
			if(dirName.startsWith(".") || dirName.toLocaleLowerCase() === ContentFolder.PACKAGE_METAINFO_DIRNAME) 
				continue;

			// В случае штатной директории пакетов будет возможности создавать и собирать пакеты.
			// packages может встречаться не в корне открытого контента.
			if(this.isContentRoot(dirName)) {
				const packagesDirPath = path.join(subFolderPath, dirName);
				const packagesFolder = await ContentFolder.create(packagesDirPath, ContentFolderType.ContentRoot);
				childrenItems.push(packagesFolder);
				continue;
			}



			// Если ошибка в текущем элементе, продолжаем парсить остальные
			const directoryPath = path.join(subFolderPath, dirName);
			try {
				const contentItem = await ContentTreeProvider.createContentElement(directoryPath, this._knowledgebaseDirectoryPath);
				if(contentItem instanceof RuleBaseItem) {
					if(await LocalizationEditorViewProvider.provider.updateRule(contentItem)) {
						DialogHelper.showInfo(`Правило ${contentItem.getName()} было обновлено в редакторе локализаций`);
					}
				}

				childrenItems.push(contentItem);
			}
			catch (error) {
				ExceptionHelper.show(error, `Ошибка разбора содержимого директории ${directoryPath}`);
			}
		}

		// Сначала директории, потом файлы
		childrenItems.sort(SortHelper.contentItemComparer);
		element.setChildren(childrenItems);

		// Подсвечиваем правила, у которых есть хотя бы один измененный файл.
		if(this._gitAPI) { 
			this.highlightsLabelForNewOrEditRules(childrenItems);
		}
		
		return childrenItems;
	}

	private isContentRoot(dirName: string) {
		const rootFolders = this._config.getContentRoots().map(dir => {return path.basename(dir);});
		return rootFolders.includes(dirName);
	}

	private async initializeRootIfNeeded(subDirectories: string[]) : Promise<void> {
		// Проверяем тип контента фактический и выбранный и уведомляем если что-то не так.
		const actualContentType = Configuration.getContentTypeBySubDirectories(subDirectories);
		const configContentType = this._config.getContentType();
		
		if(!actualContentType){
			const answer = await DialogHelper.showInfo(
				this._config.getMessage("View.ObjectTree.Message.TheKnowledgeBaseIsNotInitialized", configContentType),
				this._config.getMessage("View.ObjectTree.Message.Create"),
				this._config.getMessage("View.ObjectTree.Message.Cancel"),
			);
			
			if (answer === this._config.getMessage("View.ObjectTree.Message.Create")) {		
				return vscode.commands.executeCommand(InitKBRootCommand.Name, this._config, this._knowledgebaseDirectoryPath);
			}
		}
	}

	private async notifyIfContentTypeIsSelectedIncorrectly(subDirectories: string[]) : Promise<void> {
		// Проверяем тип контента фактический и выбранный и уведомляем если что-то не так.
		const actualContentType = Configuration.getContentTypeBySubDirectories(subDirectories);
		const configContentType = this._config.getContentType();

		if(actualContentType == ContentType.EDR && configContentType == ContentType.SIEM) {
			const answer = await DialogHelper.showInfo(
				this._config.getMessage("View.ObjectTree.Message.TheCurrentKbFormatEDRDoesNotMatchTargetSIEM"),
				this._config.getMessage("Yes"),
				this._config.getMessage("No")
			);

			if (answer === this._config.getMessage("Yes")) {
				return vscode.commands.executeCommand(SetContentTypeCommand.Name, ContentType.EDR);
			}
		}

		if(actualContentType == ContentType.SIEM && configContentType == ContentType.EDR) {
			const answer = await DialogHelper.showInfo(
				this._config.getMessage("View.ObjectTree.Message.TheCurrentKbFormatSIEMDoesNotMatchTargetEDR"),
				this._config.getMessage("Yes"),
				this._config.getMessage("No")
			);
			
			if (answer === this._config.getMessage("Yes")) {
				return vscode.commands.executeCommand(SetContentTypeCommand.Name, ContentType.SIEM);
			}
		}
	}

	private highlightsLabelForNewOrEditRules(items: ContentTreeBaseItem[]) : void {
		const kbUri = vscode.Uri.file(this._knowledgebaseDirectoryPath);
		if(!this._gitAPI) {
			return;
		}
		
		const repo = this._gitAPI.getRepository(kbUri);

		// База знаний не под git-ом.
		if(!repo) {
			return;
		}

		const changePaths = repo.state.workingTreeChanges.map( c => {
			return c.uri.fsPath.toLocaleLowerCase();
		});

		for(const item of items) {
			// В конце добавлен правильный слеш, дабы не отрабатывало на следующий случай
			// Изменилась директория \esc_profile, а выделяется \esc
			const directoryPath = item.getDirectoryPath().toLocaleLowerCase() + path.sep;

			if(changePaths.some(cp => cp.startsWith(directoryPath))) {
				item.setHighlightsLabel(item.getName());
			}
		}
	}

	public async getParent(element: RuleBaseItem) : Promise<ContentTreeBaseItem> {

		// Дошли до корня контента, заканчиваем обход.
		const contentRoot = ContentFolderType[ContentFolderType.ContentRoot];
		if(element.contextValue === contentRoot) {
			return null;
		}

		const dirFullPath = element.getDirectoryPath();
		const directoryName = path.basename(dirFullPath);
		const parentPath = path.dirname(dirFullPath);
		const parentDirName = path.basename(parentPath);

		// Дошли до уровня пакета.
		if(directoryName === ContentTreeProvider.PACKAGES_DIRNAME ||
          directoryName ===  ContentTreeProvider.MACRO_DIRNAME ||
          parentDirName === "") {
			return ContentFolder.create(parentPath, ContentFolderType.ContentRoot);
		}

		if(dirFullPath === this._knowledgebaseDirectoryPath) {
			return ContentFolder.create(parentPath, ContentFolderType.KbRoot);
		}

		const parentFolder = ContentFolder.create(parentPath, ContentFolderType.AnotherFolder);
		return Promise.resolve(parentFolder);
	}

	public static async createContentElement(elementDirectoryPath: string, knowledgebaseDirectoryPath?: string) : Promise<RuleBaseItem|ContentFolder|Table|Aggregation|Macros> {

		// Маппинг типов файлов на функции создания экземпляра
		const entityCreators = { 
			".co": Correlation.parseFromDirectory,
			".en": Enrichment.parseFromDirectory, 
			".tl": Table.parseFromDirectory, 
			".xp": Normalization.parseFromDirectory,
			".agr": Aggregation.parseFromDirectory, 
			".flt": Macros.parseFromDirectory
		};

		// Перебираем все интересующие нас расширения и проверяем есть ли в текущем списке файлы с таким расширением
		for (const extension in entityCreators){
			const createEntityFunction = entityCreators[extension];			
			// Если в списке файлов есть файл с текущим расширением, то создаём из него нужный объект		
			const files = await fs.promises.readdir(elementDirectoryPath);	
			const entityFile = files.find(filename => filename.endsWith(extension));
			if (entityFile) {				
				return createEntityFunction(elementDirectoryPath, entityFile);
			}
		}

		// У пакетов есть поддиректория _meta для метаинформации.
		const packageMetainfoDirPath = path.join(elementDirectoryPath, ContentFolder.PACKAGE_METAINFO_DIRNAME);
		if(fs.existsSync(packageMetainfoDirPath)) {
			return ContentFolder.create(elementDirectoryPath, ContentFolderType.PackageFolder);	
		}

		// TODO: переделать логику так, чтобы если базовая директория Auxiliary, то и её дочерний узел такой же.
		// TODO: учесть структуру контента EDR.
		// Вспомогательные директории в корне базы знаний кроме директории с пакетами.
		// const baseDirPath = path.dirname(elementDirectoryPath);
		// const dirName = path.basename(elementDirectoryPath);
		// if(knowledgebaseDirectoryPath && knowledgebaseDirectoryPath === baseDirPath && dirName != ContentTreeProvider.MACRO_DIRNAME) {
		// 	return await ContentFolder.create(elementDirectoryPath, ContentFolderType.AuxiliaryFolder);
		// }

		// Любая другая директория внутри экспертизы
		return ContentFolder.create(elementDirectoryPath, ContentFolderType.AnotherFolder);
	}

	public static setSelectedItem(selectedItem : RuleBaseItem | Table | Macros) : void {
		this._selectedItem = selectedItem;
	}

	public static getSelectedItem() : RuleBaseItem | Table | Macros {
		return this._selectedItem;
	}

	public static async refresh(item?: ContentTreeBaseItem) : Promise<void> {
		if(item) {
			return vscode.commands.executeCommand(ContentTreeProvider.refreshItemCommand, item);
		}
		return vscode.commands.executeCommand(ContentTreeProvider.refreshTreeCommand);
	}

	public static async selectItem(item: ContentTreeBaseItem) : Promise<boolean> {
		return vscode.commands.executeCommand(ContentTreeProvider.onRuleClickCommand, item);
	}



	private _gitAPI : API;

	public static readonly PACKAGES_DIRNAME = "packages";
	public static readonly CONTRACTS_UNPACKED_DIRNAME = "contracts";
	public static readonly TAXONOMY_DIRNAME = "taxonomy";
	public static readonly ROOT_USERS_CONTENT_UNPACKED_DIRNAME = "objects";
	public static readonly MACRO_DIRNAME = "common";
	
	public static readonly KnowledgebaseTreeId = 'KnowledgebaseTree';

	
	public static readonly onRuleClickCommand = 'KnowledgebaseTree.onElementSelectionChange';
	public static readonly onTableClickCommand = 'xp.contentTree.onTableSelectionChange';

	public static readonly buildAllCommand = 'xp.contentTree.buildAll';
	public static readonly buildLocalizationsCommand = 'xp.contentTree.buildLocalizations';
	public static readonly buildNormalizationsCommand = 'xp.contentTree.buildNormalizations';
	public static readonly buildWldCommand = 'xp.contentTree.buildWld';
	public static readonly buildKbPackageCommand = 'KnowledgebaseTree.buildKbPackage';

	public static readonly unpackKbPackageCommand = 'KnowledgebaseTree.unpackKbPackage';
	public static readonly verifyFolderCommand = 'xp.contentTree.verifyFolder';
	
	public static readonly openKnowledgebaseCommand = "xp.contentTree.openKnowledgebaseCommand";
	public static readonly createMacroCommand = "xp.contentTree.createMacroCommand";
	public static readonly createPackageCommand = "xp.contentTree.createPackageCommand";
	public static readonly createSubFolderCommand = "xp.contentTree.createSubFolderCommand";
	public static readonly deleteItemCommand = "xp.contentTree.deleteItemCommand";
	public static readonly duplicateTreeItemCommand = "xp.contentTree.duplicateItemCommand";
	public static readonly renameItemCommand = "xp.contentTree.renameItemCommand";
	public static readonly showTableDefaultsCommand = "xp.contentTree.showTableDefaultValuesCommand";
	
	private static _selectedItem : RuleBaseItem | Table | Macros;

	public static readonly refreshTreeCommand = 'xp.contentTree.refreshTree';
	public static readonly refreshItemCommand = 'xp.contentTree.refreshItem';

	private _onDidChangeTreeData: vscode.EventEmitter<ContentTreeBaseItem|undefined> = new vscode.EventEmitter<ContentTreeBaseItem|undefined>();
	readonly onDidChangeTreeData: vscode.Event<ContentTreeBaseItem|undefined> = this._onDidChangeTreeData.event;
}


