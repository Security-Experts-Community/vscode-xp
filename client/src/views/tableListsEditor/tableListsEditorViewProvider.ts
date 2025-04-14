import * as vscode from 'vscode';
import * as path from 'path';

import { DialogHelper } from '../../helpers/dialogHelper';
import { Configuration } from '../../models/configuration';
import { Table } from '../../models/content/table';
import { DocumentIsReadyCommand } from './commands/documentIsReadyCommand';
import { WebViewProviderBase } from './webViewProviderBase';
import { SaveTableListCommand } from './commands/saveTableListCommand';
import { TableListMessage } from './commands/tableListCommandBase';
import { ContentFolder } from '../../models/content/contentFolder';
import { ExceptionHelper } from '../../helpers/exceptionHelper';
import webviewHtmlProvider from '../webviewHtmlProvider';

export class TableListsEditorViewProvider extends WebViewProviderBase {
  public static readonly viewId = 'TableListsEditorView';

  constructor(private readonly _config: Configuration) {
    super();
  }

  public static init(config: Configuration): void {
    const provider = new TableListsEditorViewProvider(config);

    config
      .getContext()
      .subscriptions.push(
        vscode.commands.registerCommand(
          TableListsEditorViewProvider.showView,
          async (tableItem: Table) => provider.showView(tableItem)
        )
      );
    config.getContext().subscriptions.push(
      vscode.commands.registerCommand(
        TableListsEditorViewProvider.createTableList,
        async (parentItem: ContentFolder) => {
          return provider.createTableList(parentItem);
        }
      )
    );
  }

  public static showView = 'xp.tableListsEditor.show';
  public static createTableList = 'xp.tableListsEditor.create';

  public async createTableList(parentFolder: ContentFolder): Promise<void> {
    // Сбрасываем состояние вьюшки.
    this._parentItem = parentFolder;
    this._table = undefined;

    try {
      const title = this._config.getMessage('View.TableList.CreateTitle');
      await this.createView(title);
    } catch (error) {
      DialogHelper.showError(`Не удалось открыть табличный список`, error);
    }
  }

  public async showView(table: Table): Promise<void> {
    // Сбрасываем состояние вьюшки.
    this._parentItem = undefined;
    this._table = table;

    try {
      const tableName = table.getName();
      const title = this._config.getMessage('View.TableList.OpenTitle', tableName);
      await this.createView(title);
    } catch (error) {
      if (error.message != 'Webview is disposed') {
        DialogHelper.showError(`Не удалось открыть табличный список`, error);
      }
    }
  }

  private async createView(title: string) {
    if (this._view) {
      this._view.dispose();
      this._view = undefined;
    }

    this._view = vscode.window.createWebviewPanel(
      TableListsEditorViewProvider.viewId,
      title,
      vscode.ViewColumn.One,
      {
        retainContextWhenHidden: true,
        enableFindWidget: true
      }
    );

    this._view.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._config.getExtensionUri(), 'client/webview/out/assets'),
        vscode.Uri.joinPath(this._config.getExtensionUri(), 'client/webview/node_modules')
      ]
    };

    this._view.webview.onDidReceiveMessage(this.receiveMessageFromWebView, this);

    const getTranslation: (s: string) => string = this._config.getMessage.bind(this._config);

    const translations = {
      Save: getTranslation('Save'),
      Name: getTranslation('Name'),
      Search: getTranslation('Search'),
      String: getTranslation('String'),
      Number: getTranslation('Number'),
      DateTime: getTranslation('DateTime'),
      Regex: getTranslation('Regex'),
      EditorTitle: getTranslation('View.TableList.EditorTitle'),
      GeneralTab: getTranslation('View.TableList.GeneralTab'),
      ColumnsTab: getTranslation('View.TableList.ColumnsTab'),
      DefaultValuesTab: getTranslation('View.TableList.DefaultValuesTab'),
      DataType: getTranslation('View.TableList.DataType'),
      PrimaryKey: getTranslation('View.TableList.PrimaryKey'),
      Indexed: getTranslation('View.TableList.Indexed'),
      Nullable: getTranslation('View.TableList.Nullable'),
      AddColumn: getTranslation('View.TableList.AddColumn'),
      TypicalSize: getTranslation('View.TableList.TypicalSize'),
      TypicalSizeDescription: getTranslation('View.TableList.TypicalSizeDescription'),
      MaxSize: getTranslation('View.TableList.MaxSize'),
      MaxSizeDescription: getTranslation('View.TableList.MaxSizeDescription'),
      EmptyDefaultsMessage: getTranslation('View.TableList.EmptyDefaultsMessage'),
      AddRow: getTranslation('View.TableList.AddRow'),
      AddRowWithActiveSearch: getTranslation('View.TableList.AddRowWithActiveSearch'),
      DescriptionRU: getTranslation('View.TableList.DescriptionRU'),
      DescriptionEN: getTranslation('View.TableList.DescriptionEN'),
      FillType: getTranslation('View.TableList.FillType'),
      SelectRegistry: getTranslation('View.TableList.SelectRegistry'),
      SelectCorrelationRule: getTranslation('View.TableList.SelectCorrelationRule'),
      SelectEnrichmentRule: getTranslation('View.TableList.SelectEnrichmentRule'),
      TTL: getTranslation('View.TableList.TTL'),
      RestrictTTL: getTranslation('View.TableList.RestrictTTL'),
      TTLDays: getTranslation('View.TableList.TTLDays'),
      TTLHours: getTranslation('View.TableList.TTLHours'),
      TTLMinutes: getTranslation('View.TableList.TTLMinutes'),
      IncorrectTableName: getTranslation('View.TableList.IncorrectTableName'),
      IncorrectColumnName: getTranslation('View.TableList.IncorrectColumnName'),
      IncorrectTTLSize: getTranslation('View.TableList.IncorrectTTLSize'),
      IncorrectTTLDays: getTranslation('View.TableList.IncorrectTTLDays'),
      IncorrectTTLHours: getTranslation('View.TableList.IncorrectTTLHours'),
      IncorrectTTLMinutes: getTranslation('View.TableList.IncorrectTTLMinutes'),
      EmptyTTLValue: getTranslation('View.TableList.EmptyTTLValue'),
      IncorrectNumberFormat: getTranslation('View.TableList.IncorrectNumberFormat'),
      IncorrectDateFormat: getTranslation('View.TableList.IncorrectDateFormat'),
      IncorrectRegexFormat: getTranslation('View.TableList.IncorrectRegexFormat'),
      NullValueForNonNullableColumn: getTranslation('View.TableList.NullValueForNonNullableColumn'),
      DuplicatedColumnName: getTranslation('View.TableList.DuplicatedColumnName'),
      DuplicatedDefaultsPrimaryKey: getTranslation('View.TableList.DuplicatedDefaultsPrimaryKey'),
      NoPrimaryKeyColumns: getTranslation('View.TableList.NoPrimaryKeyColumns')
    };

    const webviewRootUri = this._view.webview
      .asWebviewUri(this._config.getExtensionUri())
      .toString();

    this._view.webview.html = await webviewHtmlProvider.getWebviewHtml(
      'table-list-editor',
      webviewRootUri,
      translations
    );
  }

  private async receiveMessageFromWebView(message: TableListMessage): Promise<boolean> {
    try {
      await this.executeCommand(message);
      return true;
    } catch (error) {
      ExceptionHelper.show(error);
      return false;
    }
  }

  private async executeCommand(message: TableListMessage) {
    switch (message.command) {
      case DocumentIsReadyCommand.commandName: {
        const command = new DocumentIsReadyCommand();
        command.processMessage(message);
        return command.execute(this);
      }
      case SaveTableListCommand.commandName: {
        const command = new SaveTableListCommand();
        command.processMessage(message);
        return command.execute(this);
      }
      default: {
        DialogHelper.showInfo(
          'Поддерживается только тип справочник. Отлеживать задачи по расширению поддержки можно [тут](https://github.com/Security-Experts-Community/vscode-xp/issues/)'
        );
      }
    }
  }

  public postMessage(message: TableListMessage): Thenable<boolean> {
    return this._view.webview.postMessage(message);
  }

  public getTable(): Table {
    return this._table;
  }

  public getParentItem(): ContentFolder {
    return this._parentItem;
  }

  private _table: Table;
  private _parentItem: ContentFolder;
  private _view?: vscode.WebviewPanel;

  public static DEFAULT_TYPICAL_SIZE = 80000;
  public static DEFAULT_MAX_SIZE = 100000;
  public static DEFAULT_TTL_PER_SEC = 86400; // Сутки в секундах
}
