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

        Log.info(null, typedError);
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
        Log.error(resultDefaultMessage);
        Log.error(error.message, error);
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
      Log.error(error.message, error);

      // Пишем вложенное.
      ExceptionHelper.recursiveWriteXpExceptionToOutput(error.getInnerException(), outputChannel);
    } else {
      Log.error(error.message, error);
    }
  }
}
