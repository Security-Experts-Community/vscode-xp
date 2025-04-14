import * as vscode from 'vscode';
import { Configuration } from './models/configuration';

export enum LogLevel {
  Error = 1,
  Warn = 2,
  Info = 3,
  Debug = 4,
  Trace = 5
}

export abstract class ILogger {
  public abstract debug(message: string, ...params: any[]): void;

  public abstract error(message: string, ...params: any[]): void;
  public abstract error(message: string, ex: Error | unknown, ...params: any[]): void;

  public abstract warn(message: string, ...params: any[]): void;
  public abstract warn(message: string, ex?: Error, ...params: any[]): void;

  public abstract info(message: string, ...params: any[]): void;
  public abstract progress(
    progress: vscode.Progress<{
      /**
       * A progress message that represents a chunk of work
       */
      message?: string;
      /**
       * An increment for discrete progress. Increments will be summed up until 100% is reached
       */
      increment?: number;
    }>,
    message: string
  ): void;

  public abstract setLogLevel(logLevel: LogLevel): void;
}

export class Logger extends ILogger {
  public constructor(private _config: Configuration) {
    super();
    this.outputChannel = this._config.getOutputChannel();
  }

  public setLogLevel(logLevel: LogLevel): void {
    this.level = logLevel;
  }

  debug(message: string, ...params: any[]): void {
    const logLevel = LogLevel.Debug;
    if (this.level < logLevel) return;

    this.writeLog(logLevel, message, ...params);
  }

  trace(message: string, ...params: any[]): void {
    const logLevel = LogLevel.Trace;
    if (this.level < logLevel) return;

    this.writeLog(logLevel, message, ...params);
  }

  error(message: string, ...params: any[]): void;
  error(message: string, ex: Error, ...params: any[]): void {
    const logLevel = LogLevel.Error;
    if (this.level < logLevel) return;

    if (ex) {
      console.error(this.timestamp, message ?? '', ...params, ex);
      this.outputChannel.appendLine(
        `${this.timestamp} [Error] ${message ?? ''} ${this.formatParams(params)}\n${String(ex.stack)}`
      );
      return;
    }

    this.writeLog(logLevel, message, ...params);
  }

  warn(message: string, ex?: Error, ...params: any[]): void;
  warn(message: string, ...params: any[]): void {
    const logLevel = LogLevel.Warn;
    if (this.level < logLevel) return;

    this.writeLog(logLevel, message, ...params);
  }

  info(message: string, ...params: any[]): void {
    const logLevel = LogLevel.Info;
    if (this.level < logLevel) return;

    this.writeLog(logLevel, message, ...params);
  }

  progress(
    progress: vscode.Progress<{
      /**
       * A progress message that represents a chunk of work
       */
      message?: string;
      /**
       * An increment for discrete progress. Increments will be summed up until 100% is reached
       */
      increment?: number;
    }>,
    message: string
  ): void {
    this.info(message);
    if (progress) {
      progress.report({ message: message });
    }
  }

  private writeLog(level: LogLevel, message: string, ...params: any[]) {
    const formattedMessage = this.formatMessage(level, message);
    switch (level) {
      case LogLevel.Error: {
        console.error(formattedMessage, ...params);
        break;
      }
      case LogLevel.Warn: {
        console.warn(formattedMessage, ...params);
        break;
      }
      case LogLevel.Info: {
        console.info(formattedMessage, ...params);
        break;
      }
      case LogLevel.Debug: {
        console.debug(formattedMessage, ...params);
        break;
      }
    }

    this.outputChannel.appendLine(`${formattedMessage} ${this.formatParams(params)}`);
  }

  private formatMessage(level: LogLevel, message: string): string {
    const logLevelString = LogLevel[level];
    return `${this.timestamp} [${logLevelString}] ${message ?? ''}`;
  }

  private formatParams(params: any[]): string {
    return params.filter((p) => p).join(', ');
  }

  private get timestamp(): string {
    // TODO: использовать moment
    const date = new Date();
    const yyyy = date.getFullYear();

    const month = date.getMonth() + 1; // Months start at 0!
    const dd = date.getDate();

    const hh = date.getHours(); // Months start at 0!
    const mm = date.getMinutes();
    const ss = date.getSeconds();

    const monthStr = this.formatNumber(month);
    const ddStr = this.formatNumber(dd);
    const mmStr = this.formatNumber(mm);
    const hhStr = this.formatNumber(hh);
    const ssStr = this.formatNumber(ss);

    const formattedToday = `${ddStr}.${monthStr}.${yyyy} ${hhStr}:${mmStr}:${ssStr}`;
    return `[${formattedToday}]`;
  }

  private formatNumber(num: number): string {
    if (num < 10) {
      return '0' + num;
    } else {
      return num.toString();
    }
  }

  public static init(config: Configuration): Logger {
    const log = new Logger(config);
    if (config.getExtensionMode() === vscode.ExtensionMode.Development) {
      log.setLogLevel(LogLevel.Trace);
      return log;
    }

    log.setLogLevel(config.getLogLevel());
    return log;
  }

  private level: LogLevel;
  private outputChannel: vscode.OutputChannel;
}
