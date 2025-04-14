import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';

import { Log } from '../extension';
import { BaseWebViewController, WebViewMessage } from './baseWebViewController';

export abstract class WebViewCommand<T extends WebViewMessage = WebViewMessage> {
  constructor(cmdName: string, message: T) {
    this._cmdName = cmdName;
    this._message = message;
  }
  public abstract execute(controller: BaseWebViewController): Promise<void>;
  public get cmdName(): string {
    return this._cmdName;
  }

  protected get message(): T {
    return this._message;
  }

  private _cmdName: string;
  private _message: T;
}

export class LogErrorCommand extends WebViewCommand {
  constructor(message: WebViewMessage) {
    super(LogErrorCommand.name, message);
  }

  public async execute(controller: BaseWebViewController): Promise<void> {
    const message = this.message.params as string;
    Log.error(`frontend: ${message}`);
  }
}
