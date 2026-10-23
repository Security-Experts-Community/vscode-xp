import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
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
import { Configuration } from '../../models/configuration';
import { OpenKnowledgebaseCommand } from './commands/openKnowledgebaseCommand';
// import { UnitTestsListViewProvider } from '../unitTestEditor/unitTestsListViewProvider';
import { CreateRuleViewProvider } from '../createRule/createRuleViewProvider';
import { CreateSubFolderCommand } from './commands/createSubFolderCommand';
import { RenameTreeItemCommand } from './commands/renameTreeItemCommand';
import { CreatePackageCommand } from './commands/createPackageCommand';
import { SiemJOutputParser } from '../../models/siemj/siemJOutputParser';
import { BuildAllGraphsAndTableListsCommand } from './commands/buildAllGraphsAndTableListsCommand';
import { UnpackKbCommand } from './commands/unpackKbCommand';
import { ContentType } from '../../contentType/contentType';
import { SetContentTypeCommand } from '../../contentType/setContentTypeCommand';
import { InitKBRootCommand } from './commands/initKnowledgebaseRootCommand';
import { ExceptionHelper } from '../../helpers/exceptionHelper';
import { ContentTreeBaseItem } from '../../models/content/contentTreeBaseItem';
import { ContentCheckingCommand } from './commands/contentCheckingCommand';
import { BuildLocalizationsCommand } from './commands/buildLocalizationsCommand';
import { BuildWldCommand } from './commands/buildWldCommand';
import { BuildNormalizationsCommand } from './commands/buildNormalizationsCommand';
import { NormalizeEventsFromFilesCommand } from './commands/normalizeEventsFromFilesCommand';
import { DuplicateTreeItemCommand } from './commands/duplicateTreeItemCommand';
import { CreateMacroCommand } from './commands/createMacrosCommand';
import { PackKbCommand } from './commands/packKbCommand';
import { OpenTableCommand } from './commands/openTableCommand';
import { CommandHelper } from '../../helpers/commandHelper';
import { SortHelper } from '../../helpers/sortHelper';
import { Log } from '../../extension';
import { GetSIEMJVersion } from '../../models/siemj/siemjManager';
import { ContentTreeFileOperations } from './contentTreeFileOperations';
import { ContentTreeDragAndDropController } from './contentTreeDragAndDropController';

export class ContentTreeProvider implements vscode.TreeDataProvider<ContentTreeBaseItem> {
  static async init(config: Configuration, knowledgebaseDirectoryPath: string): Promise<void> {
    const context = config.getContext();

    const contentTreeProvider = new ContentTreeProvider(knowledgebaseDirectoryPath, config);
    const onItemsChanged = (paths: string[]) => {
      contentTreeProvider.invalidate(paths);
      contentTreeProvider.refresh();
    };

    const contentTree = vscode.window.createTreeView(ContentTreeProvider.KnowledgebaseTreeId, {
      treeDataProvider: contentTreeProvider,
      showCollapseAll: true,
      canSelectMany: true,
      dragAndDropController: new ContentTreeDragAndDropController(config, onItemsChanged)
    });
    context.subscriptions.push(contentTree);

    // Отслеживание изменений в базе знаний для обновления дерева и сброса кеша правил.
    contentTreeProvider.watchKnowledgebase(context);

    // Удаление графа нормализаций при изменении формул, чтобы при запуске тестов и прочего граф пересобрался.
    // Остальные артефакты от формул не зависят, поэтому их не трогаем.
    const normalizationFilesWatcher = vscode.workspace.createFileSystemWatcher('**/*.xp');
    config.getContext().subscriptions.push(normalizationFilesWatcher);

    const normalizationGraphInvalidatorCallback = async () => {
      for (const contentRoot of config.getContentRoots()) {
        const rootFolder = path.basename(contentRoot);
        const normGraphFilePath = config.getNormalizationsGraphFilePath(rootFolder);
        await fs.promises.rm(normGraphFilePath, { force: true });
        Log.info(
          `The normalization graph ${normGraphFilePath} was deleted after detecting a change in the formula code`
        );
      }
    };
    normalizationFilesWatcher.onDidCreate(normalizationGraphInvalidatorCallback);
    normalizationFilesWatcher.onDidDelete(normalizationGraphInvalidatorCallback);
    normalizationFilesWatcher.onDidChange(normalizationGraphInvalidatorCallback);

    // Ручное или автоматическое обновление дерева контента.
    // Явное обновление перечитывает все правила с диска, даже если изменения не попали в отслеживание файлов.
    vscode.commands.registerCommand(ContentTreeProvider.refreshTreeCommand, async () => {
      contentTreeProvider.itemsCache.clear();
      contentTreeProvider.refresh();
    });

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
          const command = new ContentCheckingCommand(config, item);
          await CommandHelper.singleExecutionCommand(command);
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(ContentTreeProvider.openKnowledgebaseCommand, async () => {
        const command = new OpenKnowledgebaseCommand(config);
        await CommandHelper.singleExecutionCommand(command);
      })
    );

    // Изменение выбора правила с открытием визуализации нужных данных.
    vscode.commands.registerCommand(
      ContentTreeProvider.onRuleClickCommand,
      async (item: RuleBaseItem | Table | Macros): Promise<boolean> => {
        try {
          // Открываем код правила.
          const ruleFilePath = item.getFilePath();

          if (ruleFilePath && !fs.existsSync(ruleFilePath)) {
            // Попытка открыть несуществующий item
            // Возможно при переключении веток репозитория или ручной модификации репозитория.
            ContentTreeProvider.setSelectedItem(null);
            // await vscode.commands.executeCommand(UnitTestsListViewProvider.refreshCommand);

            contentTreeProvider.refresh();
            return false;
          }

          ContentTreeProvider.setSelectedItem(item);

          // Открываем код правила
          if (ruleFilePath) {
            await vscode.window.showTextDocument(vscode.Uri.file(ruleFilePath), {
              viewColumn: vscode.ViewColumn.One
            });
          }
        } catch (error) {
          ExceptionHelper.show(error, `Ошибка во время обработки файла ${item.getFilePath()}`);
          return false;
        }

        return true;
      }
    );

    vscode.commands.registerCommand(
      ContentTreeProvider.onTableClickCommand,
      async (table: Table): Promise<boolean> => {
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

    // При вызове сочетанием клавиш элемент не передается, тогда берем выделенные в дереве.
    const getTargets = (
      item?: ContentTreeBaseItem,
      items?: ContentTreeBaseItem[]
    ): ContentTreeBaseItem[] => {
      if (items?.length) {
        return items;
      }
      if (item) {
        return [item];
      }
      return [...contentTree.selection];
    };

    // Переименование правила.
    context.subscriptions.push(
      vscode.commands.registerCommand(
        ContentTreeProvider.renameItemCommand,
        async (item?: RuleBaseItem) => {
          const target = item ?? (contentTree.selection[0] as RuleBaseItem);
          if (!target) {
            return;
          }

          if (!ContentTreeProvider.RENAMABLE_ITEM_TYPES.includes(target.contextValue)) {
            DialogHelper.showInfo(
              config.getMessage('View.ObjectTree.Message.RenameIsNotSupported', target.getName())
            );
            return;
          }

          const command = new RenameTreeItemCommand(config, target);
          await command.execute();
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

    // Удаление сущностей.
    context.subscriptions.push(
      vscode.commands.registerCommand(
        ContentTreeProvider.deleteItemCommand,
        async (item?: ContentTreeBaseItem, items?: ContentTreeBaseItem[]) => {
          try {
            const deletedPaths = await ContentTreeFileOperations.delete(
              config,
              getTargets(item, items)
            );
            if (deletedPaths.length) {
              onItemsChanged(deletedPaths);
            }
          } catch (error) {
            ExceptionHelper.show(error, config.getMessage('View.ObjectTree.Message.DeleteFailed'));
          }
        }
      )
    );

    // Буфер обмена дерева: копирование и вырезание с последующей вставкой.
    let clipboard: { items: ContentTreeBaseItem[]; cut: boolean } | undefined;
    const setClipboard = async (items: ContentTreeBaseItem[], cut: boolean) => {
      const movableItems = items.filter(ContentTreeFileOperations.isMovable);
      clipboard = movableItems.length ? { items: movableItems, cut } : undefined;
      await vscode.commands.executeCommand(
        'setContext',
        ContentTreeProvider.hasClipboardContextKey,
        !!clipboard
      );
    };

    context.subscriptions.push(
      vscode.commands.registerCommand(
        ContentTreeProvider.copyItemCommand,
        (item?: ContentTreeBaseItem, items?: ContentTreeBaseItem[]) =>
          setClipboard(getTargets(item, items), false)
      ),
      vscode.commands.registerCommand(
        ContentTreeProvider.cutItemCommand,
        (item?: ContentTreeBaseItem, items?: ContentTreeBaseItem[]) =>
          setClipboard(getTargets(item, items), true)
      ),
      vscode.commands.registerCommand(
        ContentTreeProvider.pasteItemCommand,
        async (item?: ContentTreeBaseItem) => {
          const target = item ?? contentTree.selection[0];
          if (!clipboard || !target) {
            return;
          }

          const targetDirPath = ContentTreeFileOperations.getTargetDirectoryPath(target);
          try {
            if (clipboard.cut) {
              const movedPaths = await ContentTreeFileOperations.move(
                config,
                clipboard.items,
                targetDirPath
              );
              await setClipboard([], false);
              onItemsChanged([...movedPaths, targetDirPath]);
            } else {
              const createdPaths = await ContentTreeFileOperations.copy(
                config,
                clipboard.items,
                targetDirPath
              );
              onItemsChanged([...createdPaths, targetDirPath]);
            }
          } catch (error) {
            ExceptionHelper.show(error, config.getMessage('View.ObjectTree.Message.PasteFailed'));
          }
        }
      )
    );

    // Пути, открытие в системе и терминале, как в стандартном проводнике.
    context.subscriptions.push(
      vscode.commands.registerCommand(
        ContentTreeProvider.copyPathCommand,
        (item?: ContentTreeBaseItem, items?: ContentTreeBaseItem[]) => {
          const paths = getTargets(item, items).map((i) => i.getDirectoryPath());
          return vscode.env.clipboard.writeText(paths.join(os.EOL));
        }
      ),
      vscode.commands.registerCommand(
        ContentTreeProvider.copyRelativePathCommand,
        (item?: ContentTreeBaseItem, items?: ContentTreeBaseItem[]) => {
          const paths = getTargets(item, items).map((i) =>
            vscode.workspace.asRelativePath(i.getDirectoryPath(), false)
          );
          return vscode.env.clipboard.writeText(paths.join(os.EOL));
        }
      ),
      vscode.commands.registerCommand(
        ContentTreeProvider.revealInOSCommand,
        (item?: ContentTreeBaseItem) => {
          const target = item ?? contentTree.selection[0];
          if (target) {
            return vscode.commands.executeCommand(
              'revealFileInOS',
              vscode.Uri.file(target.getDirectoryPath())
            );
          }
        }
      ),
      vscode.commands.registerCommand(
        ContentTreeProvider.revealInExplorerCommand,
        (item?: ContentTreeBaseItem) => {
          const target = item ?? contentTree.selection[0];
          if (target) {
            const targetPath = target.getFilePath() ?? target.getDirectoryPath();
            return vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(targetPath));
          }
        }
      ),
      vscode.commands.registerCommand(
        ContentTreeProvider.openInTerminalCommand,
        (item?: ContentTreeBaseItem) => {
          const target = item ?? contentTree.selection[0];
          if (target) {
            const dirPath = target.isFolder() ? target.getDirectoryPath() : target.getParentPath();
            return vscode.window.createTerminal({ cwd: dirPath }).show();
          }
        }
      ),
      vscode.commands.registerCommand(
        ContentTreeProvider.openToSideCommand,
        (item?: ContentTreeBaseItem) => {
          const filePath = (item ?? contentTree.selection[0])?.getFilePath();
          if (filePath && fs.existsSync(filePath)) {
            return vscode.window.showTextDocument(vscode.Uri.file(filePath), {
              viewColumn: vscode.ViewColumn.Beside
            });
          }
        }
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
          const command = new UnpackKbCommand(config, selectedItem);
          await CommandHelper.singleExecutionCommand(
            command,
            `Неожиданная ошибка распаковки kb-пакета`
          );
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(ContentTreeProvider.buildAllCommand, async () => {
        const parser = new SiemJOutputParser(config, GetSIEMJVersion(config));
        const command = new BuildAllGraphsAndTableListsCommand(config, parser);
        await CommandHelper.singleExecutionCommand(command);
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(ContentTreeProvider.buildLocalizationsCommand, async () => {
        const parser = new SiemJOutputParser(config, GetSIEMJVersion(config));
        const command = new BuildLocalizationsCommand(config, { outputParser: parser });
        await CommandHelper.singleExecutionCommand(command);
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(ContentTreeProvider.buildNormalizationsCommand, async () => {
        const parser = new SiemJOutputParser(config, GetSIEMJVersion(config));
        const command = new BuildNormalizationsCommand(config, parser);
        await CommandHelper.singleExecutionCommand(command);
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        ContentTreeProvider.normalizeEventsFromFilesCommand,
        async () => {
          const parser = new SiemJOutputParser(config, GetSIEMJVersion(config));
          const command = new NormalizeEventsFromFilesCommand(config, parser);
          await CommandHelper.singleExecutionCommand(
            command,
            config.getMessage('View.NormalizeEventsFromFiles.Title')
          );
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(ContentTreeProvider.buildWldCommand, async () => {
        const parser = new SiemJOutputParser(config, GetSIEMJVersion(config));
        const command = new BuildWldCommand(config, parser);
        await CommandHelper.singleExecutionCommand(command);
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        ContentTreeProvider.buildKbPackageCommand,
        async (selectedPackage: RuleBaseItem) => {
          if (!config.isKbOpened()) {
            DialogHelper.showInfo(
              config.getMessage('View.ObjectTree.Message.NeedToOpenKnowledgeBase')
            );
            return;
          }

          // Выбираем директорию для выгрузки пакета.
          const packageName = selectedPackage.getName();
          const fileInfos = await vscode.window.showSaveDialog({
            filters: { 'Knowledge base (*.kb)': ['kb'] },
            defaultUri: vscode.Uri.file(packageName)
          });

          if (!fileInfos) {
            DialogHelper.showError(config.getMessage('No path selected'));
            return;
          }

          const unpackKbFilePath = fileInfos.fsPath;
          const command = new PackKbCommand(config, selectedPackage, unpackKbFilePath);
          await command.execute();
        }
      )
    );

    // Связка перехвата двух событий ниже позволяет организовать синхронизацию работы в Explorer и дереве контента.
    // Если дерево открыто, то при переключении вкладок меняем выделенное правило в дереве.
    // Если дерева не видно, тогда сохраняем редактор в переменную.
    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(async (te: vscode.TextEditor) => {
        if (!te) {
          return;
        }

        if (contentTree.visible) {
          return contentTreeProvider.revealRuleTreeItem(contentTree, te.document.fileName);
        }

        ContentTreeProvider.selectedFilePath = te.document.fileName;
      })
    );

    // Дерево снова видно, значит на основе сохраненного выше редактора показываем нужный узел в дереве контента.
    context.subscriptions.push(
      contentTree.onDidChangeVisibility(async (e: vscode.TreeViewVisibilityChangeEvent) => {
        if (!e.visible) {
          return;
        }

        // Если ранее уже был выбран файл или файл был открыт при запуске vsCode.
        const filePath =
          ContentTreeProvider.selectedFilePath ??
          vscode.window.activeTextEditor?.document?.fileName;
        return contentTreeProvider.revealRuleTreeItem(contentTree, filePath);
      })
    );
  }

  public static selectedFilePath: string;

  /**
   * Выделяет в дереве правило, к которому относится файл, не перемещая фокус из редактора.
   */
  private async revealRuleTreeItem(
    kbTree: vscode.TreeView<ContentTreeBaseItem>,
    filePath: string
  ): Promise<void> {
    if (!filePath || !this.knowledgebaseDirectoryPath) {
      return;
    }

    const ruleDirectoryPath = FileSystemHelper.ruleFilePathToDirectory(filePath);
    if (
      !ruleDirectoryPath ||
      !FileSystemHelper.isSubPath(ruleDirectoryPath, this.knowledgebaseDirectoryPath) ||
      !fs.existsSync(ruleDirectoryPath)
    ) {
      return;
    }

    // Правило уже выделено.
    if (kbTree.selection.some((i) => i.getDirectoryPath() === ruleDirectoryPath)) {
      return;
    }

    try {
      const rule = await this.getItem(ruleDirectoryPath);
      // Директории не выделяем в дереве контента
      if (rule.isFolder()) {
        return;
      }

      await kbTree.reveal(rule, { focus: false, expand: false, select: true });
    } catch (error) {
      Log.debug(`Failed to reveal ${ruleDirectoryPath} in the object tree`, error);
    }
  }

  constructor(
    private knowledgebaseDirectoryPath: string | undefined,
    private _config: Configuration
  ) {}

  refresh(item?: ContentTreeBaseItem): void {
    if (item) {
      this._onDidChangeTreeData.fire(item);
    } else {
      this._onDidChangeTreeData.fire(undefined);
    }
  }

  getTreeItem(element: ContentTreeBaseItem): vscode.TreeItem {
    // Идентификатор сохраняет раскрытые узлы и выделение при обновлении дерева,
    // а путь позволяет теме иконок и git-у оформлять элементы как в стандартном проводнике.
    const directoryPath = element.getDirectoryPath();
    element.id = directoryPath;
    element.resourceUri = vscode.Uri.file(directoryPath);
    return element;
  }

  async getChildren(element?: ContentTreeBaseItem): Promise<ContentTreeBaseItem[]> {
    if (!this.knowledgebaseDirectoryPath) {
      return [];
    }

    if (!element) {
      const subDirectories = FileSystemHelper.readSubDirectoryNames(
        this.knowledgebaseDirectoryPath
      );
      this.initializeRootIfNeeded(subDirectories);
      return [await this.getItem(this.knowledgebaseDirectoryPath)];
    }

    // Получаем список поддиректорий.
    const subFolderPath = element.getDirectoryPath();
    const subDirectories = FileSystemHelper.readSubDirectoryNames(subFolderPath);
    if (subFolderPath === this.knowledgebaseDirectoryPath) {
      this.notifyIfContentTypeIsSelectedIncorrectly(subDirectories);
    }

    // .git, .vscode и т.д.
    // _meta штатная директория в каждом пакете
    const contentDirectories = subDirectories.filter(
      (dirName) =>
        !dirName.startsWith('.') &&
        dirName.toLocaleLowerCase() !== ContentFolder.PACKAGE_METAINFO_DIRNAME
    );

    // Правила разбираются параллельно, ошибка в одном правиле не мешает показать остальные.
    const childrenItems = (
      await Promise.all(
        contentDirectories.map(async (dirName) => {
          const directoryPath = path.join(subFolderPath, dirName);
          try {
            return await this.getItem(directoryPath);
          } catch (error) {
            ExceptionHelper.show(error, `Ошибка разбора содержимого директории ${directoryPath}`);
            return undefined;
          }
        })
      )
    ).filter((item) => item);

    // Сначала директории, потом файлы
    childrenItems.sort(SortHelper.contentItemComparer);
    element.setChildren(childrenItems);
    return childrenItems;
  }

  /**
   * Возвращает элемент дерева для директории. Разобранные элементы кешируются до изменения их файлов,
   * поэтому повторное раскрытие и обновление дерева не перечитывают все правила с диска.
   */
  private getItem(directoryPath: string): Promise<ContentTreeBaseItem> {
    const cachedItem = this.itemsCache.get(directoryPath);
    if (cachedItem) {
      return cachedItem;
    }

    const item = this.createItem(directoryPath);
    this.itemsCache.set(directoryPath, item);
    item.catch(() => {
      if (this.itemsCache.get(directoryPath) === item) {
        this.itemsCache.delete(directoryPath);
      }
    });
    return item;
  }

  private async createItem(directoryPath: string): Promise<ContentTreeBaseItem> {
    // В случае штатной директории пакетов будет возможности создавать и собирать пакеты.
    // packages может встречаться не в корне открытого контента.
    const dirName = path.basename(directoryPath);
    if (this.isContentRoot(dirName)) {
      return ContentFolder.create(directoryPath, ContentFolderType.ContentRoot);
    }

    if (directoryPath === this.knowledgebaseDirectoryPath) {
      return ContentFolder.create(directoryPath, ContentFolderType.KbRoot);
    }

    return ContentTreeProvider.createContentElement(directoryPath);
  }

  /**
   * Сбрасывает кеш элементов, затронутых изменением путей: самих путей, их родителей и вложенных элементов.
   */
  public invalidate(changedPaths: string[]): void {
    if (changedPaths.length === 0) {
      return;
    }

    const affectedPaths = new Set<string>();
    for (const changedPath of changedPaths) {
      for (let p = changedPath; ; p = path.dirname(p)) {
        affectedPaths.add(p);
        if (p === this.knowledgebaseDirectoryPath || p === path.dirname(p)) {
          break;
        }
      }
    }

    const changedPathsSet = new Set(changedPaths);
    for (const cachedPath of [...this.itemsCache.keys()]) {
      if (affectedPaths.has(cachedPath)) {
        this.itemsCache.delete(cachedPath);
        continue;
      }

      for (let p = path.dirname(cachedPath); p !== path.dirname(p); p = path.dirname(p)) {
        if (changedPathsSet.has(p)) {
          this.itemsCache.delete(cachedPath);
          break;
        }
      }
    }
  }

  private watchKnowledgebase(context: vscode.ExtensionContext): void {
    if (!this.knowledgebaseDirectoryPath) {
      return;
    }

    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(vscode.Uri.file(this.knowledgebaseDirectoryPath), '**/*')
    );
    context.subscriptions.push(watcher);

    // Изменение содержимого файлов только сбрасывает кеш, а появление и удаление файлов меняет структуру дерева.
    watcher.onDidCreate((uri) => this.onKnowledgebaseChanged(uri, true));
    watcher.onDidDelete((uri) => this.onKnowledgebaseChanged(uri, true));
    watcher.onDidChange((uri) => this.onKnowledgebaseChanged(uri, false));
  }

  private onKnowledgebaseChanged(uri: vscode.Uri, structureChanged: boolean): void {
    const relativePath = path.relative(this.knowledgebaseDirectoryPath, uri.fsPath);
    if (relativePath.split(path.sep).some((entry) => entry.startsWith('.'))) {
      return;
    }

    this.pendingChangedPaths.add(uri.fsPath);
    this.pendingStructureChange ||= structureChanged;

    // Изменения приходят пачками (переключение веток, сохранение правила), обрабатываем их разом.
    clearTimeout(this.pendingChangesTimer);
    this.pendingChangesTimer = setTimeout(() => {
      this.invalidate([...this.pendingChangedPaths]);
      this.pendingChangedPaths.clear();

      if (this.pendingStructureChange) {
        this.pendingStructureChange = false;
        this.refresh();
        Log.debug('The object tree was updated after files were created or deleted');
      }
    }, ContentTreeProvider.CHANGES_DEBOUNCE_MS);
  }

  private isContentRoot(dirName: string) {
    const rootFolders = this._config.getContentRoots().map((dir) => {
      return path.basename(dir);
    });
    return rootFolders.includes(dirName);
  }

  private async initializeRootIfNeeded(subDirectories: string[]): Promise<void> {
    // Проверяем тип контента фактический и выбранный и уведомляем если что-то не так.
    const actualContentType = Configuration.getContentTypeBySubDirectories(subDirectories);
    const configContentType = this._config.getContentType();

    if (!actualContentType) {
      const answer = await DialogHelper.showWarning(
        this._config.getMessage(
          'View.ObjectTree.Message.TheKnowledgeBaseIsNotInitialized',
          configContentType
        ),
        this._config.getMessage('View.ObjectTree.Message.Create'),
        this._config.getMessage('View.ObjectTree.Message.Cancel')
      );

      if (answer === this._config.getMessage('View.ObjectTree.Message.Create')) {
        return vscode.commands.executeCommand(
          InitKBRootCommand.Name,
          this._config,
          this.knowledgebaseDirectoryPath
        );
      }
    }
  }

  private async notifyIfContentTypeIsSelectedIncorrectly(subDirectories: string[]): Promise<void> {
    // Проверяем тип контента фактический и выбранный и уведомляем если что-то не так.
    const actualContentType = Configuration.getContentTypeBySubDirectories(subDirectories);
    const configContentType = this._config.getContentType();

    if (actualContentType == ContentType.EDR && configContentType == ContentType.SIEM) {
      const answer = await DialogHelper.showWarning(
        this._config.getMessage(
          'View.ObjectTree.Message.TheCurrentKbFormatEDRDoesNotMatchTargetSIEM'
        ),
        this._config.getMessage('Yes'),
        this._config.getMessage('No')
      );

      if (answer === this._config.getMessage('Yes')) {
        return vscode.commands.executeCommand(SetContentTypeCommand.Name, ContentType.EDR);
      }
    }

    if (actualContentType == ContentType.SIEM && configContentType == ContentType.EDR) {
      const answer = await DialogHelper.showInfo(
        this._config.getMessage(
          'View.ObjectTree.Message.TheCurrentKbFormatSIEMDoesNotMatchTargetEDR'
        ),
        this._config.getMessage('Yes'),
        this._config.getMessage('No')
      );

      if (answer === this._config.getMessage('Yes')) {
        return vscode.commands.executeCommand(SetContentTypeCommand.Name, ContentType.SIEM);
      }
    }
  }

  public async getParent(element: ContentTreeBaseItem): Promise<ContentTreeBaseItem> {
    const directoryPath = element.getDirectoryPath();
    if (!this.knowledgebaseDirectoryPath || directoryPath === this.knowledgebaseDirectoryPath) {
      return undefined;
    }

    const parentPath = path.dirname(directoryPath);
    if (!FileSystemHelper.isSubPath(parentPath, this.knowledgebaseDirectoryPath)) {
      return undefined;
    }

    return this.getItem(parentPath);
  }

  public static async createContentElement(
    elementDirectoryPath: string
  ): Promise<RuleBaseItem | ContentFolder | Table | Aggregation | Macros> {
    // Маппинг типов файлов на функции создания экземпляра в порядке приоритета.
    const entityCreators = {
      '.co': Correlation.parseFromDirectory,
      '.en': Enrichment.parseFromDirectory,
      '.tl': Table.parseFromDirectory,
      '.xp': Normalization.parseFromDirectory,
      '.agr': Aggregation.parseFromDirectory,
      '.flt': Macros.parseFromDirectory
    };

    // Если в директории есть файл с одним из расширений, то создаем из него нужный объект
    const files = await fs.promises.readdir(elementDirectoryPath);
    for (const extension in entityCreators) {
      const entityFile = files.find((filename) => filename.endsWith(extension));
      if (entityFile) {
        return entityCreators[extension](elementDirectoryPath, entityFile);
      }
    }

    // У пакетов есть поддиректория _meta для метаинформации.
    const packageMetainfoDirPath = path.join(
      elementDirectoryPath,
      ContentFolder.PACKAGE_METAINFO_DIRNAME
    );
    if (fs.existsSync(packageMetainfoDirPath)) {
      return ContentFolder.create(elementDirectoryPath, ContentFolderType.PackageFolder);
    }

    // TODO: переделать логику так, чтобы если базовая директория Auxiliary, то и ее дочерний узел такой же.
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

  public static setSelectedItem(selectedItem: RuleBaseItem | Table | Macros): void {
    this.selectedItem = selectedItem;
  }

  public static getSelectedItem(): RuleBaseItem | Table | Macros {
    return this.selectedItem;
  }

  public static async refresh(item?: ContentTreeBaseItem): Promise<void> {
    if (item) {
      return vscode.commands.executeCommand(ContentTreeProvider.refreshItemCommand, item);
    }
    return vscode.commands.executeCommand(ContentTreeProvider.refreshTreeCommand);
  }

  public static async selectItem(item: ContentTreeBaseItem): Promise<boolean> {
    return vscode.commands.executeCommand(ContentTreeProvider.onRuleClickCommand, item);
  }

  private itemsCache = new Map<string, Promise<ContentTreeBaseItem>>();
  private pendingChangedPaths = new Set<string>();
  private pendingStructureChange = false;
  private pendingChangesTimer: NodeJS.Timeout;
  private static readonly CHANGES_DEBOUNCE_MS = 200;

  private static readonly RENAMABLE_ITEM_TYPES: string[] = [
    'Correlation',
    'Normalization',
    'Enrichment',
    ContentFolderType.PackageFolder,
    ContentFolderType.AuxiliaryFolder,
    ContentFolderType.ContentRoot,
    ContentFolderType.AnotherFolder
  ];

  public static readonly PACKAGES_DIRNAME = 'packages';
  public static readonly ROOT_USERS_CONTENT_UNPACKED_DIRNAME = 'objects';
  public static readonly MACRO_DIRNAME = 'common';

  public static readonly KnowledgebaseTreeId = 'KnowledgebaseTree';

  public static readonly onRuleClickCommand = 'KnowledgebaseTree.onElementSelectionChange';
  public static readonly onTableClickCommand = 'xp.contentTree.onTableSelectionChange';

  public static readonly buildAllCommand = 'xp.contentTree.buildAll';
  public static readonly buildLocalizationsCommand = 'xp.contentTree.buildLocalizations';
  public static readonly buildNormalizationsCommand = 'xp.contentTree.buildNormalizations';
  public static readonly normalizeEventsFromFilesCommand =
    'xp.contentTree.normalizeEventsFromFiles';
  public static readonly buildWldCommand = 'xp.contentTree.buildWld';
  public static readonly buildKbPackageCommand = 'KnowledgebaseTree.buildKbPackage';

  public static readonly unpackKbPackageCommand = 'KnowledgebaseTree.unpackKbPackage';
  public static readonly verifyFolderCommand = 'xp.contentTree.verifyFolder';

  public static readonly openKnowledgebaseCommand = 'xp.contentTree.openKnowledgebaseCommand';
  public static readonly createMacroCommand = 'xp.contentTree.createMacroCommand';
  public static readonly createPackageCommand = 'xp.contentTree.createPackageCommand';
  public static readonly createSubFolderCommand = 'xp.contentTree.createSubFolderCommand';
  public static readonly deleteItemCommand = 'xp.contentTree.deleteItemCommand';
  public static readonly duplicateTreeItemCommand = 'xp.contentTree.duplicateItemCommand';
  public static readonly renameItemCommand = 'xp.contentTree.renameItemCommand';
  public static readonly copyItemCommand = 'xp.contentTree.copyItemCommand';
  public static readonly cutItemCommand = 'xp.contentTree.cutItemCommand';
  public static readonly pasteItemCommand = 'xp.contentTree.pasteItemCommand';
  public static readonly copyPathCommand = 'xp.contentTree.copyPathCommand';
  public static readonly copyRelativePathCommand = 'xp.contentTree.copyRelativePathCommand';
  public static readonly revealInOSCommand = 'xp.contentTree.revealInOSCommand';
  public static readonly revealInExplorerCommand = 'xp.contentTree.revealInExplorerCommand';
  public static readonly openInTerminalCommand = 'xp.contentTree.openInTerminalCommand';
  public static readonly openToSideCommand = 'xp.contentTree.openToSideCommand';

  public static readonly hasClipboardContextKey = 'xp.contentTree.hasClipboard';

  private static selectedItem: RuleBaseItem | Table | Macros;

  public static readonly refreshTreeCommand = 'xp.contentTree.refreshTree';
  public static readonly refreshItemCommand = 'xp.contentTree.refreshItem';

  private _onDidChangeTreeData: vscode.EventEmitter<ContentTreeBaseItem | undefined> =
    new vscode.EventEmitter<ContentTreeBaseItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<ContentTreeBaseItem | undefined> =
    this._onDidChangeTreeData.event;
}
