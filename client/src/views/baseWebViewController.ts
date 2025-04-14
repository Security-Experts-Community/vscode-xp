import * as vscode from 'vscode';

import { Configuration } from '../models/configuration';
import { XpException } from '../models/xpException';
import { ExceptionHelper } from '../helpers/exceptionHelper';
import { LogErrorCommand } from './webViewCommands';

export interface WebViewDescriptor {
  viewId: string;
  config: Configuration;
  templatePath?: string;
  webViewOptions: vscode.WebviewPanelOptions | vscode.WebviewOptions;
}

export class WebViewMessage {
  cmdName: string;
  message: string;
  params?: unknown;
}

export abstract class BaseWebViewController {
  constructor(protected descriptor: WebViewDescriptor) {}

  protected async showView(): Promise<void> {
    // Если открыта еще одна локализация, то закрываем ее перед открытием новой.
    if (this.webView) {
      this.webView.dispose();
      this.webView = undefined;
    }

    try {
      // Создать и показать панель.
      this.webView = vscode.window.createWebviewPanel(
        this.descriptor.viewId,
        this.getTitle(),
        vscode.ViewColumn.One,
        this.descriptor.webViewOptions
      );

      this.webView.webview.onDidReceiveMessage(this.receiveMessageFromWebViewDefault, this);

      this.webView.onDidDispose((e: void) => {
        this.onDispose(e);
        this.webView = undefined;
      });

      this.webView.webview.html = await this.renderHtml();
    } catch (error) {
      ExceptionHelper.show(error, `Не удалось открыть ${this.getTitle()}`);
    }
  }

  protected abstract onDispose(e: void): void;

  public reveal(): void {
    this.webView.reveal();
  }

  /**
   * Обработчик команд от webView
   * @param message
   */
  protected abstract receiveMessageFromWebView(message: any): Promise<void>;

  /**
   * Получает верстку для отображения webView
   */
  protected abstract renderHtml(): string | Promise<string>;

  /**
   * Выполняется перед отображением вьюшки.
   */
  protected abstract preRender(): Promise<boolean>;

  public async show(): Promise<void> {
    const result = await this.preRender();
    if (!result) {
      return;
    }
    await this.showView();
    return;
  }

  protected abstract getTitle(): string;

  protected async receiveMessageFromWebViewDefault(message: WebViewMessage): Promise<void> {
    if (message == null) return;

    switch (message.cmdName) {
      case 'LogErrorCommand': {
        const cmd = new LogErrorCommand(message);
        cmd.execute(this);
        break;
      }
      default: {
        this.receiveMessageFromWebView(message);
      }
    }
  }

  public postMessage(message: any): Thenable<boolean> {
    if (!this.webView) {
      throw new XpException(
        'Невозможно отобразить данные в окне, так как оно закрыто. Откройте его заново и повторите операцию'
      );
    }

    return this.webView.webview.postMessage(message);
  }

  protected webView?: vscode.WebviewPanel;
  protected title: string;
  public static END_OF_LINE = '\n';
}
