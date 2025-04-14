import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as iconv from 'iconv-lite';

import { EncodingType } from '../models/configuration';
import { Log } from '../extension';

export interface ExecutionProcessOptions {
  encoding?: EncodingType;
  outputChannel?: vscode.OutputChannel;
  cancellationToken?: vscode.CancellationToken;
  /**
   * Проверяет выполнимость команды (например, отсутствия нужного модуля в директориях PATH).
   * Если команда не выполнима, будет прошено исключение.
   */
  checkCommandBeforeExecution?: boolean;
}

export class ExecutionResult {
  output: string;
  exitCode: number;
  isInterrupted = false;
}

export class ProcessHelper {
  /**
   * Позволяет собрать сложную команду в виде запускаемого модуля и списка параметров *без экранирования*
   * @param command базовая команда для запуска процесса
   * @param args список параметров, которые не надо экранировать
   * @param encoding кодировка вывода от команды
   * @returns строковый вывод запускаемого процесса
   */
  public static readProcessArgsOutputSync(
    command: string,
    args: string[],
    encoding: BufferEncoding
  ): string {
    const argsString = command + ' ' + args.join(' ');
    const childProcess = child_process.spawnSync(argsString, {
      shell: true,
      cwd: process.cwd(),
      env: process.env,
      stdio: 'pipe',
      encoding
    });

    if (childProcess.status != 0) {
      return childProcess.stdout;
    }

    return childProcess.stdout;
  }

  /**
   * Выполняет команду с параметрами асинхронно
   * @param command команда/путь к исполняемому файлу для выполнения
   * @param params параметры команды
   * @param options дополнительные настройки
   * @returns возвращает результат выполнения команды по ее окончанию
   */
  public static execute(
    command: string,
    params: string[],
    options: ExecutionProcessOptions
  ): Promise<ExecutionResult> {
    return new Promise(function (resolve, reject) {
      let child: child_process.ChildProcessWithoutNullStreams;

      // Вывод выполняемой команды для локализации ошибки.
      Log.info(`${command} ${params.join(' ')}`);

      if (!options?.encoding) {
        options.encoding = 'utf-8';
      }

      try {
        if (options.checkCommandBeforeExecution) {
          const result = child_process.spawnSync(command);
          if (result.error !== undefined) {
            throw result.error;
          }
        }
        child = child_process.spawn(command, params);
      } catch (error) {
        reject(error);
        return;
      }

      const executionResult: ExecutionResult = new ExecutionResult();
      executionResult.output = '';

      if (options.cancellationToken) {
        options.cancellationToken.onCancellationRequested((e) => {
          child.kill();
          executionResult.exitCode = child.exitCode;
          executionResult.isInterrupted = true;
          resolve(executionResult);
        });
      }

      child.stdout.on('data', function (data: Buffer) {
        const encodedData = ProcessHelper.encodeOutputToString(data, options.encoding);
        executionResult.output += encodedData;

        if (options.outputChannel) {
          options.outputChannel.append(encodedData);
        }

        if (options.cancellationToken.isCancellationRequested) {
          child.kill();
          executionResult.exitCode = child.exitCode;
          executionResult.isInterrupted = true;
          resolve(executionResult);
        }
      });

      child.stdout.on('error', function (exception: Error) {
        const encodedData = exception.toString();
        executionResult.output += encodedData;

        if (options.outputChannel) {
          options.outputChannel.append(encodedData);
        }

        if (options.cancellationToken.isCancellationRequested) {
          child.kill();
          executionResult.exitCode = child.exitCode;
          executionResult.isInterrupted = true;
          resolve(executionResult);
        }
      });

      child.stderr.on('data', function (exception: Error) {
        const encodedData = exception.toString();
        executionResult.output += encodedData;

        if (options.outputChannel) {
          options.outputChannel.append(encodedData);
        }

        if (options.cancellationToken.isCancellationRequested) {
          child.kill();
          executionResult.exitCode = child.exitCode;
          executionResult.isInterrupted = true;
          resolve(executionResult);
        }
      });

      child.on('close', function (code: number) {
        executionResult.exitCode = code;
        resolve(executionResult);
      });
    });
  }

  public static executeWithArgsWithRealtimeEmmiterOutput(
    command: string,
    params: string[],
    emmiter: vscode.EventEmitter<string>
  ): Promise<string> {
    return new Promise(function (resolve, reject) {
      // Записываем в лог выполнения строку запуска
      emmiter.fire(`\n\nXP :: Run command: ${command} ${params.join(' ')}\n`);

      let child;
      try {
        child = child_process.spawn(command, params);
      } catch (error) {
        reject(error.message);
        return;
      }

      let output = '';

      child.stdout.setEncoding('utf8');
      child.stdout.on('data', function (data) {
        output += data.toString();
        emmiter.fire(data.toString());
      });

      child.stdout.setEncoding('utf8');
      child.stdout.on('error', function (data) {
        emmiter.fire(data.toString());
        output += data.toString();
      });

      child.stderr.setEncoding('utf8');
      child.stderr.on('data', function (data) {
        emmiter.fire(data.toString());
        output += data.toString();
      });

      child.on('close', function (code) {
        resolve(output);
      });
    });
  }

  private static encodeOutputToString(data: Buffer, inputEncoding: EncodingType) {
    return iconv.decode(data, inputEncoding, { defaultEncoding: 'utf-8' });
  }
}
