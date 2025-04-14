import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as classTransformer from 'class-transformer';

import { MustacheFormatter } from '../mustacheFormatter';
import { Configuration } from '../../models/configuration';
import { BaseWebViewController, WebViewDescriptor, WebViewMessage } from '../baseWebViewController';
import { Log } from '../../extension';
import { CorrelateEventsCommand } from './correlateEventsCommand';
import { AppendEventMessage, AppendEventsCommand } from './appendEventCommand';
import { DialogHelper } from '../../helpers/dialogHelper';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';

export class RetroCorrelationViewController extends BaseWebViewController {
  protected onDispose(e: void): void {
    return;
  }

  protected getTitle(): string {
    return this.descriptor.config.getMessage('View.CorrelateLogFiles.Title');
  }

  public static viewId = 'xp.retroCorrelation';
  public static showViewCommand = 'xp.retroCorrelationShow';

  private constructor(
    descriptor: WebViewDescriptor,
    private readonly formatter: MustacheFormatter
  ) {
    super(descriptor);
  }

  public static async init(config: Configuration): Promise<void> {
    // Форма создания корреляции.
    const createCorrelationTemplateFilePath = path.join(
      config.getExtensionPath(),
      'client',
      'templates',
      'RetroCorrelation.html'
    );
    const createCorrelationTemplateContent = (
      await fs.promises.readFile(createCorrelationTemplateFilePath)
    ).toString();

    const view = new RetroCorrelationViewController(
      {
        config: config,
        viewId: RetroCorrelationViewController.viewId,
        webViewOptions: {
          retainContextWhenHidden: true,
          enableCommandUris: true,
          enableScripts: true,
          enableFindWidget: true
        }
      },
      new MustacheFormatter(createCorrelationTemplateContent)
    );

    config.getContext().subscriptions.push(
      vscode.commands.registerCommand(RetroCorrelationViewController.showViewCommand, async () => {
        return view.show();
      })
    );
  }

  protected async preRender(): Promise<boolean> {
    this.tmpDirPath = this.descriptor.config.getRandTmpSubDirectoryPath();
    this.xmlEventsFilePath = path.join(
      this.tmpDirPath,
      RetroCorrelationViewController.XML_EVENTS_FILENAME
    );

    await fs.promises.mkdir(this.tmpDirPath, { recursive: true });
    return true;
  }

  protected renderHtml(): string {
    const resourcesUri = this.descriptor.config.getExtensionUri();
    const extensionBaseUri = this.webView.webview.asWebviewUri(resourcesUri);
    const templateDefaultContent = {
      ExtensionBaseUri: extensionBaseUri,
      AddEventFiles: this.descriptor.config.getMessage('View.CorrelateLogFiles.AddEventFiles'),
      CorrelateEvents: this.descriptor.config.getMessage('View.CorrelateLogFiles.CorrelateEvents'),
      CorrelationEvents: this.descriptor.config.getMessage(
        'View.CorrelateLogFiles.CorrelationEvents'
      )
    };

    const htmlContent = this.formatter.format(templateDefaultContent);
    return htmlContent;
  }

  protected async receiveMessageFromWebView(message: WebViewMessage): Promise<void> {
    switch (message.cmdName) {
      case 'AppendEventsCommand': {
        // TODO: подумать над улучшением представления команд.
        message.params = {
          tmpDirPath: this.tmpDirPath,
          xmlEventsFilePath: this.xmlEventsFilePath
        };

        const typedMessage = classTransformer.plainToInstance(AppendEventMessage, message);
        const cmd = new AppendEventsCommand(typedMessage);
        return cmd.execute(this);
      }
      case 'CorrelateEventsCommand': {
        const jsonFiles = await FileSystemHelper.readFilesFromDirectory(this.tmpDirPath);
        if (jsonFiles.length === 0) {
          DialogHelper.showInfo(
            `Файлы для корреляции не добавлены. Добавьте файлы с помощью кнопки 'Добавить файлы с событиями' и повторите`
          );
          return;
        }
        const cmd = new CorrelateEventsCommand(message);
        // TODO: подумать над улучшением представления команд.
        message.params = {
          tmpDirPath: this.tmpDirPath,
          xmlEventsFilePath: this.xmlEventsFilePath
        };

        return cmd.execute(this);
      }
      default: {
        Log.error(
          `Команды ${message.cmdName} не найдена в контроллере ${RetroCorrelationViewController.name}`
        );
      }
    }
  }

  private xmlEventsFilePath: string;
  private tmpDirPath: string;

  public static XML_EVENTS_FILENAME = 'events.xml';
}
