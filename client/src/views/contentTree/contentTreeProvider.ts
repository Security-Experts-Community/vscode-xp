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
import { BuildAllGraphCommand } from './commands/buildAllGraphCommand';
import { PackKbAction } from './actions/packSIEMAllPackagesAction';
import { UnpackKbCommand } from './commands/unpackKbCommand';
import { ContentType } from '../../contentType/contentType';
import { SetContentTypeCommand } from '../../contentType/setContentTypeCommand';
import { GitHooks } from './gitHooks';
import { InitKBRootCommand } from './commands/initKnowledgebaseRootCommand';
import { ExceptionHelper } from '../../helpers/exceptionHelper';
import { ContentTreeBaseItem } from '../../models/content/contentTreeBaseItem';
import { LocalizationEditorViewProvider } from '../localizationEditor/localizationEditorViewProvider';
import { ContentVerifierCommand } from './commands/contentVerifierCommand';
import { BuildLocalizationsCommand } from './commands/buildLocalizationsCommand';
import { BuildWldCommand } from './commands/buildWldCommand';
import { BuildNormalizationsCommand } from './commands/buildNormalizationsCommand';
import { DuplicateTreeItemCommand } from './commands/duplicateTreeItemCommand';
import { CreateMacroCommand } from './commands/createMacrosCommand';

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
					const lt = new ContentVerifierCommand(config);
					await lt.execute(item);
				}
			)
		);
	
		
		context.subscriptions.push(
			vscode.commands.registerCommand(
				OpenKnowledgebaseCommand.openKnowledgebaseCommand,
				() => {
					const openKnowledgebaseCommand = new OpenKnowledgebaseCommand();
					openKnowledgebaseCommand.execute(); 
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
	
		// Форма создания правил.
		await CreateRuleViewProvider.init(config);
		
		// Создание поддиректории.
		context.subscriptions.push(
			vscode.commands.registerCommand(
				CreateSubFolderCommand.CommandName,
				async (item: RuleBaseItem) => {
					const command = new CreateSubFolderCommand();
					command.execute(item);
				},
				this
			)
		);

		// Создание макроса
		context.subscriptions.push(
			vscode.commands.registerCommand(
				CreateMacroCommand.CommandName,
				async (item: RuleBaseItem) => {
					const command = new CreateMacroCommand(config);
					command.execute(item);
				},
				this
			)
		);
	
		// Переименование правила.
		context.subscriptions.push(
			vscode.commands.registerCommand(
				RenameTreeItemCommand.CommandName,
				async (item: RuleBaseItem) => {
					const command = new RenameTreeItemCommand(config);
					command.execute(item);
				},
				this
			)
		);

		// Дублирование правила.
		context.subscriptions.push(
			vscode.commands.registerCommand(
				DuplicateTreeItemCommand.CommandName,
				async (item: RuleBaseItem) => {
					const command = new DuplicateTreeItemCommand(config);
					command.execute(item);
				},
				this
			)
		);
	
		// Удаление сущности.
		context.subscriptions.push(
			vscode.commands.registerCommand(
				DeleteContentItemCommand.CommandName,
				async (item: RuleBaseItem) => {
					const command = new DeleteContentItemCommand();
					command.execute(item);
				},
				this
			)
		);
	
		// Удаление пакета.
		context.subscriptions.push(
			vscode.commands.registerCommand(
				CreatePackageCommand.CommandName,
				async (item: RuleBaseItem) => {
					const command = new CreatePackageCommand();
					command.execute(item);
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
					
					const action = new UnpackKbCommand(config);
					try {
						await action.execute(selectedItem);
					}
					catch(error) {
						ExceptionHelper.show(error, `Неожиданная ошибка распаковки kb-пакета`);
					}
				}
			)
		);
	
		context.subscriptions.push(
			vscode.commands.registerCommand(
				ContentTreeProvider.buildAllCommand,
				async () => {
					const parser = new SiemJOutputParser();
					const buildCommand = new BuildAllGraphCommand(config, parser);
					await buildCommand.execute();
				}
			)
		);

		context.subscriptions.push(
			vscode.commands.registerCommand(
				ContentTreeProvider.buildLocalizationsCommand,
				async () => {
					const parser = new SiemJOutputParser();
					const buildCommand = new BuildLocalizationsCommand(config, parser);
					await buildCommand.execute();
				}
			)
		);

		context.subscriptions.push(
			vscode.commands.registerCommand(
				ContentTreeProvider.buildNormalizationsCommand,
				async () => {
					const parser = new SiemJOutputParser();
					const buildCommand = new BuildNormalizationsCommand(config, parser);
					await buildCommand.execute();
				}
			)
		);

		context.subscriptions.push(
			vscode.commands.registerCommand(
				ContentTreeProvider.buildWldCommand,
				async (selectedItem: RuleBaseItem) => {
					const parser = new SiemJOutputParser();
					const buildCommand = new BuildWldCommand(config, parser);
					await buildCommand.execute();
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
					
					const pkba = new PackKbAction(config);

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

					// Удаление существующего файла.
					const unpackKbFilePath = fileInfos.fsPath; 
					await pkba.run(selectedPackage, unpackKbFilePath);
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
						return ContentTreeProvider.selectItem(selectedItem);
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

			const packagesFolder = await ContentFolder.create(this._knowledgebaseDirectoryPath, ContentFolderType.AnotherFolder);
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

			// Пакеты.
			const parentFolder = path.basename(subFolderPath).toLocaleLowerCase();
			const directoryPath = path.join(subFolderPath, dirName);

			// Если ошибка в текущем элементе, продолжаем парсить остальные
			try {
				const contentItem = await ContentTreeProvider.createContentElement(directoryPath);
				if(contentItem instanceof RuleBaseItem) {
					if(await LocalizationEditorViewProvider.provider.updateRule(contentItem)) {
						DialogHelper.showInfo(`Правило ${contentItem.getName()} было обновлено в редакторе локализаций`);
					}
				}

				childrenItems.push(contentItem);
			}
			catch (error) {
				ExceptionHelper.show(error, `Ошибка парсинга директории ${directoryPath}`);
			}
		}

		// Сначала директории, потом файлы
		childrenItems.sort(
			(l, r) => {
				// Сначала идут потом отдельные item-ы.
				if(l.isFolder() && !r.isFolder()) {
					return -1;
				}

				// Сначала идут системные пакеты, потом пользовательские.
				const lObjectId = l.getMetaInfo().getObjectId();
				const rObjectId = r.getMetaInfo().getObjectId();
				if(
					lObjectId &&
					lObjectId.startsWith("PT") &&
					// Либо это обычная директория, либо пользовательский пакет
					(!rObjectId || !rObjectId.startsWith("PT"))
					) {
					return -1;
				}

				return l.getName().localeCompare(r.getName());
			}
		);

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
				this._config.getMessage("TheKnowledgeBaseIsNotInitialized", configContentType),
				this._config.getMessage("Yes"),
				this._config.getMessage("No")
			);
			
			if (answer === this._config.getMessage("Yes")) {		
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
				"Формат базы знаний (EDR) не соответствует текущему целевому продукту (SIEM). Выбрать другой продукт? Неправильная настройка не позволит собрать пакет",
				this._config.getMessage("Yes"),
				this._config.getMessage("No")
			);

			if (answer === this._config.getMessage("Yes")) {
				return vscode.commands.executeCommand(SetContentTypeCommand.Name, ContentType.EDR);
			}
		}

		if(actualContentType == ContentType.SIEM && configContentType == ContentType.EDR) {
			const answer = await DialogHelper.showInfo(
				"Формат базы знаний (SIEM) не соответствует текущему целевому продукту (EDR). Выбрать другой продукт? Неправильная настройка не позволит собрать пакет",
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

		const fullPath = element.getDirectoryPath();
		const directoryName = path.basename(fullPath);
		const parentPath = path.dirname(fullPath);
		const parentDirName = path.basename(parentPath);

		// Дошли до уровня пакета.
		if(directoryName === ContentTreeProvider.PACKAGES_DIRNAME ||
          directoryName ===  ContentTreeProvider.MACROS_DIRNAME ||
          parentDirName === "") {
			const packageFolder = await ContentFolder.create(parentPath, ContentFolderType.ContentRoot);
			return Promise.resolve(packageFolder);
		}

		const parentFolder = ContentFolder.create(parentPath, ContentFolderType.AnotherFolder);
		return Promise.resolve(parentFolder);
	}

	public static async createContentElement(elementDirectoryPath: string) : Promise<RuleBaseItem|ContentFolder|Table|Aggregation|Macros> {

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

		return ContentFolder.create(elementDirectoryPath, ContentFolderType.AnotherFolder);
	}

	private static setSelectedItem(selectedItem : RuleBaseItem | Table | Macros) : void {
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
	public static readonly MACROS_DIRNAME = "common";
	public static readonly CONTRACTS_UNPACKED_DIRNAME = "contracts";
	
	public static readonly KnowledgebaseTreeId = 'KnowledgebaseTree';
	
	public static readonly onRuleClickCommand = 'KnowledgebaseTree.onElementSelectionChange';
	public static readonly buildAllCommand = 'xp.contentTree.buildAll';
	public static readonly buildLocalizationsCommand = 'xp.contentTree.buildLocalizations';
	public static readonly buildNormalizationsCommand = 'xp.contentTree.buildNormalizations';
	public static readonly buildWldCommand = 'xp.contentTree.buildWld';
	public static readonly buildKbPackageCommand = 'KnowledgebaseTree.buildKbPackage';
	public static readonly unpackKbPackageCommand = 'KnowledgebaseTree.unpackKbPackage';
	public static readonly verifyFolderCommand = 'xp.contentTree.verifyFolder';
	
	private static _selectedItem : RuleBaseItem | Table | Macros;

	public static readonly refreshTreeCommand = 'SiemContentEditor.refreshKbTree';
	public static readonly refreshItemCommand = 'xp.contentTree.refreshItem';

	private _onDidChangeTreeData: vscode.EventEmitter<ContentTreeBaseItem|undefined> = new vscode.EventEmitter<ContentTreeBaseItem|undefined>();
	readonly onDidChangeTreeData: vscode.Event<ContentTreeBaseItem|undefined> = this._onDidChangeTreeData.event;
}


