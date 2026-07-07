import * as vscode from 'vscode';

import { XpException } from '../models/xpException';
import { Log } from '../extension';
import { Configuration } from '../models/configuration';
import { StringHelper } from './stringHelper';

export class ExceptionHelper {
  public static async show(error: Error, defaultMessage?: string): Promise<void> {
    const errorType = error.constructor.name;
    const configuration = Configuration.get();
    const outputChannel = configuration.getOutputChannel();

    switch (errorType) {
      case 'XpException':
      case 'FileSystemException':
      case 'IncorrectFieldFillingException': {
        const typedError = error as XpException;

        vscode.window.showErrorMessage(typedError.message);
        ExceptionHelper.recursiveWriteXpExceptionToOutput(typedError, outputChannel);
        break;
      }
      case 'OperationCanceledException': {
        const typedError = error as XpException;

        ExceptionHelper.writeInfo(outputChannel, typedError.message ?? '');
        vscode.window.showInformationMessage(typedError.message);
        break;
      }
      default: {
        // get the resulting message
        let resultDefaultMessage: string;
        if (defaultMessage) {
          resultDefaultMessage = defaultMessage;
        } else {
          resultDefaultMessage = configuration.getMessage('UnexpectedError');
        }

        // prepare user message
        const uncaughtExceptionMessage = configuration.getMessage(
          'UncaughtExceptionMessagePostfix'
        );
        const userMessage = StringHelper.combiningMessages(
          resultDefaultMessage,
          uncaughtExceptionMessage
        );
        vscode.window.showErrorMessage(userMessage);

        // Пишем stack в output.
        ExceptionHelper.writeError(outputChannel, resultDefaultMessage);
        ExceptionHelper.writeError(outputChannel, error.message, error);
        outputChannel.show();
      }
    }
  }

  private static recursiveWriteXpExceptionToOutput(
    error: XpException | Error,
    outputChannel: vscode.OutputChannel
  ) {
    // Есть вложенные исключения.
    if (error instanceof XpException && error.getInnerException()) {
      // Пишем текущие исключение.
      ExceptionHelper.writeError(outputChannel, error.message, error);

      // Пишем вложенное.
      ExceptionHelper.recursiveWriteXpExceptionToOutput(error.getInnerException(), outputChannel);
    } else {
      ExceptionHelper.writeError(outputChannel, error.message, error);
    }
  }

  private static writeInfo(outputChannel: vscode.OutputChannel, message: string): void {
    if (Log) {
      Log.info(message);
      return;
    }

    outputChannel.appendLine(`${ExceptionHelper.timestamp()} [Info] ${message}`);
  }

  private static writeError(
    outputChannel: vscode.OutputChannel,
    message: string,
    error?: Error | unknown
  ): void {
    if (Log) {
      if (error) {
        Log.error(message, error);
      } else {
        Log.error(message);
      }
      return;
    }

    outputChannel.appendLine(`${ExceptionHelper.timestamp()} [Error] ${message ?? ''}`);
    if (error) {
      outputChannel.appendLine(String((error as Error)?.stack ?? error));
    }
  }

  private static timestamp(): string {
    const date = new Date();
    const yyyy = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `[${day}.${month}.${yyyy} ${hours}:${minutes}:${seconds}]`;
  }
}
