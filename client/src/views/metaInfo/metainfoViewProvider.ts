import * as path from 'path';
import * as vscode from 'vscode';

import { DialogHelper } from '../../helpers/dialogHelper';
import { RuleBaseItem } from '../../models/content/ruleBaseItem';
import { MustacheFormatter } from '../mustacheFormatter';
import { MetaInfoUpdater } from './metaInfoUpdater';
import { Configuration } from '../../models/configuration';
import { ExceptionHelper } from '../../helpers/exceptionHelper';
import { BaseWebViewController } from '../baseWebViewController';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import webviewHtmlProvider from '../webviewHtmlProvider';
import { YamlHelper } from '../../helpers/yamlHelper';
import { MetaInfo } from '../../models/metaInfo/metaInfo';
import { ContentTreeProvider } from '../contentTree/contentTreeProvider';

interface AssociativeArray {
  [key: string]: MetainfoViewProvider;
}

export class MetainfoViewProvider extends BaseWebViewController {
  protected onDispose(e: void): void {
    const ruleName = this.rule.getName();
    delete MetainfoViewProvider.Providers[ruleName];
  }

  protected getTitle(): string {
    return this.config.getMessage('View.Metainfo', this.rule.getName());
  }

  protected async receiveMessageFromWebView(message: any): Promise<void> {
    switch (message.command) {
      case 'documentIsReady':
        const metaInfo = this.rule.getMetaInfo().toObject();
        const { author } = this.config.getWorkspaceConfiguration();
        const dependencies = metaInfo.AsInFile.ContentRelations?.Uses?.SIEMKB?.Auto;

        this.webView.webview.postMessage({
          command: 'MetaInfoEditor.setState',
          payload: { metaInfo: { ...metaInfo, dependencies }, author }
        });
        break;

      case 'MetaInfoEditor.saveMetaInfo': {
        try {
          // Обновление метаданных.
          const newMetaInfoPlain = message.payload;
          const metaInfo = this.rule.getMetaInfo();
          this.metaInfoUpdater.update(metaInfo, newMetaInfoPlain);

          // Сохранением и перечитываем из файла.
          const corrFullPath = this.rule.getDirectoryPath();
          await metaInfo.save(corrFullPath);
        } catch (error) {
          return ExceptionHelper.show(
            error,
            this.config.getMessage('View.Metainfo.Message.DefaultErrorMetaInfoSave')
          );
        }

        DialogHelper.showInfo(this.config.getMessage('View.Metainfo.Message.MetadataIsSaved'));

        break;
      }

      case 'MetaInfoEditor.openFileByObjectId':
        const { objectId } = message.payload;
        const metaInfoFiles = await vscode.workspace.findFiles(
          `**/${MetaInfo.METAINFO_FILENAME}`,
          '**/.git/**'
        );
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            cancellable: true
          },
          async (progress) => {
            progress.report({
              message: `${this.config.getMessage('View.Metainfo.SearchingForTheFile')}..`
            });
            try {
              const decoder = new TextDecoder('utf-8');
              for (const fileUri of metaInfoFiles) {
                const fileContent = await vscode.workspace.fs.readFile(fileUri);
                const metaInfo = YamlHelper.parse(decoder.decode(fileContent));
                if (metaInfo.ObjectId == objectId) {
                  const ruleDirectoryPath = FileSystemHelper.ruleFilePathToDirectory(
                    fileUri.fsPath
                  );
                  const rule = await ContentTreeProvider.createContentElement(ruleDirectoryPath);
                  vscode.commands.executeCommand(rule.command.command, rule);
                  return;
                }
              }
            } catch (error) {
              ExceptionHelper.show(
                error,
                this.config.getMessage('View.Metainfo.FailedToOpenTheFile')
              );
            }
            DialogHelper.showError(
              this.config.getMessage('View.Metainfo.NoFileWithSuchObjectIdFound', objectId)
            );
          }
        );
        break;
    }
  }

  public async renderHtml(): Promise<string> {
    const metaInfo = this.rule.getMetaInfo().toObject();

    const translations = {
      EditorTitle: this.config.getMessage('View.Metainfo', metaInfo.Name),
      GeneralTab: this.config.getMessage('View.Metainfo.GeneralTab'),
      SourcesAndTacticsTab: this.config.getMessage('View.Metainfo.SourcesAndTacticsTab'),
      DependenciesTab: this.config.getMessage('View.Metainfo.DependenciesTab'),
      NothingFound: this.config.getMessage('NothingFound'),
      Selected: this.config.getMessage('Selected'),
      Add: this.config.getMessage('Add'),
      Delete: this.config.getMessage('Delete'),
      Save: this.config.getMessage('Save'),
      KnowledgeHolders: this.config.getMessage('View.Metainfo.KnowledgeHolders'),
      Created: this.config.getMessage('View.Metainfo.Created'),
      Updated: this.config.getMessage('View.Metainfo.Updated'),
      Id: this.config.getMessage('View.Metainfo.Id'),
      Usecases: this.config.getMessage('View.Metainfo.Usecases'),
      Falsepositives: this.config.getMessage('View.Metainfo.Falsepositives'),
      Improvements: this.config.getMessage('View.Metainfo.Improvements'),
      References: this.config.getMessage('View.Metainfo.References'),
      DataSources: this.config.getMessage('View.Metainfo.DataSources'),
      MITRE: this.config.getMessage('View.Metainfo.MITRE'),
      AddEvent: this.config.getMessage('View.Metainfo.AddEvent'),
      AddTechnique: this.config.getMessage('View.Metainfo.AddTechnique'),
      EmptyValue: this.config.getMessage('View.Metainfo.EmptyValue'),
      EmptyEventValue: this.config.getMessage('View.Metainfo.EmptyEventValue'),
      DuplicatedEventValue: this.config.getMessage('View.Metainfo.DuplicatedEventValue'),
      NoDependencies: this.config.getMessage('View.Metainfo.NoDependencies'),
      GoToFile: this.config.getMessage('View.Metainfo.GoToFile')
    };

    const webviewRootUri = this.webView.webview
      .asWebviewUri(this.config.getExtensionUri())
      .toString();

    return await webviewHtmlProvider.getWebviewHtml(
      'meta-info-editor',
      webviewRootUri,
      translations
    );
  }

  protected preRender(): Promise<boolean> {
    return Promise.resolve(true);
  }

  public static readonly viewId = 'MetaInfoView';
  public static showMetaInfoEditorCommand = 'MetaInfoView.showMetaInfoEditor';

  constructor(
    private readonly rule: RuleBaseItem,
    private readonly config: Configuration,
    private readonly formatter: MustacheFormatter
  ) {
    super({
      config: config,
      viewId: MetainfoViewProvider.viewId,
      webViewOptions: {
        enableScripts: true,
        enableFindWidget: true,
        retainContextWhenHidden: true
      }
    });
  }

  public static async init(config: Configuration): Promise<void> {
    const metaInfoTemplateFilePath = path.join(
      config.getExtensionPath(),
      'client',
      'templates',
      'MetaInfo.html'
    );
    const metainfoTemplateContent =
      await FileSystemHelper.readContentFile(metaInfoTemplateFilePath);

    config.getContext().subscriptions.push(
      vscode.commands.registerCommand(
        MetainfoViewProvider.showMetaInfoEditorCommand,
        async (rule: RuleBaseItem) => {
          const ruleName = rule.getName();
          if (MetainfoViewProvider.Providers[ruleName]) {
            MetainfoViewProvider.Providers[ruleName].reveal();
            return;
          }

          const provider = new MetainfoViewProvider(
            rule,
            config,
            new MustacheFormatter(metainfoTemplateContent)
          );
          MetainfoViewProvider.Providers[ruleName] = provider;

          provider.show();
        }
      )
    );
  }

  private metaInfoUpdater = new MetaInfoUpdater();

  public static Providers: AssociativeArray[] = [];
}
