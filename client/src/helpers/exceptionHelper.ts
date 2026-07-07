import * as vscode from 'vscode';

import { XpException } from '../models/xpException';
import { Log } from '../extension';
import { Configuration } from '../models/configuration';
import { StringHelper } from './stringHelper';
import { CommonCommands } from '../models/command/commonCommands';

export class ExceptionHelper {
  private static readonly TOOL_BACKEND_UNAVAILABLE_MESSAGES = [
    'Docker is not installed or is not available in PATH',
    'Container not running.',
    'is not running. Start a container with XP tools, then retry.',
    'Path mapping failed.',
    'Tool not found in container'
  ];

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

  public static async showToolBackendUnavailableError(
    error: unknown,
    configuration = Configuration.get()
  ): Promise<boolean> {
    if (!(error instanceof XpException) || !this.isToolBackendUnavailableError(error)) {
      return false;
    }

    const outputChannel = configuration.getOutputChannel();
    this.recursiveWriteXpExceptionToOutput(error, outputChannel);

    const outputAction = 'Show Output';
    const configureAction = 'Configure';
    const actions = configuration.isLocalMacOS()
      ? [outputAction, configureAction]
      : [outputAction];

    const selection = await vscode.window.showErrorMessage(error.message, ...actions);

    if (selection === outputAction) {
      await vscode.commands.executeCommand(CommonCommands.SHOW_OUTPUT_CHANNEL_COMMAND);
    } else if (selection === configureAction) {
      await vscode.commands.executeCommand(
        CommonCommands.CONFIGURE_MACOS_CONTAINER_BACKEND_COMMAND
      );
    }

    return true;
  }

  public static isToolBackendUnavailableError(error: unknown): error is XpException {
    if (!(error instanceof XpException)) {
      return false;
    }

    return this.TOOL_BACKEND_UNAVAILABLE_MESSAGES.some((part) => error.message.includes(part));
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
