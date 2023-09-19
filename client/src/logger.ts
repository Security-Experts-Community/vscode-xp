import * as vscode from 'vscode';
import { Configuration } from './models/configuration';
import { XpException } from './models/xpException';

export const enum LogLevel {
	Error = 1,
	Warn = 2,
	Info = 3,
	Debug = 4,
}

export abstract class ILogger {
	public abstract debug(message: string, ...params: any[]): void;

	public abstract error(ex: Error | unknown, message?: string, ...params: any[]): void;

	public abstract info(message: string, ...params: any[]): void;

	public abstract setLogLevel(logLevel: LogLevel) : void;
}

export class Logger extends ILogger {
	public constructor(private _config: Configuration) {
		super();
		this._output = this._config.getOutputChannel();
	}

	public setLogLevel (logLevel: LogLevel) : void {
		this._level = logLevel;
	}

	debug(message: string, ...params: any[]): void {
		if (this._level < LogLevel.Debug) return;
		if (this._output == null || this._level < LogLevel.Debug) return;

		console.log(this.timestamp, message ?? "", ...params);
		this._output.appendLine(`${this.timestamp} ${message ?? ""}${this.formatParams(params)}`);
	}

	error(ex: Error|XpException, message?: string, ...params: any[]): void {
		if (this._output == null || this._level < LogLevel.Error) return;

		if(ex) {
			console.error(this.timestamp, message ?? "", ...params, ex);
			this._output.appendLine(
				`${this.timestamp} ${message ?? ""}${this.formatParams(params)}\n${String(ex.stack)}`,
			);
			return;
		}

		console.error(this.timestamp, message ?? "", ...params);
		this._output.appendLine(
			`${this.timestamp} ${message ?? ""}${this.formatParams(params)}`,
		);
	}

	warn(message: string, ...params: any[]): void {
		if (this._level < LogLevel.Warn) return;
		if (this._output == null || this._level < LogLevel.Warn) return;

		console.warn(this.timestamp, message ?? "", ...params);
		this._output.appendLine(
			`${this.timestamp} ${message ?? ""}${this.formatParams(params)}`
		);
	}

	info(message: string, ...params: any[]): void  {
		if (this._output == null || this._level < LogLevel.Info) return;

		console.log(this.timestamp, message ?? "", ...params);
		this._output.appendLine(`${this.timestamp} ${message ?? ""}${this.formatParams(params)}`);
	}

	private formatParams(params: any[]): string {
		return params.filter(p => p).join(', ');
	}

	private get timestamp(): string {
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

		const formattedToday = `${hhStr}:${mmStr}:${ssStr} ${ddStr}.${monthStr}.${yyyy}`;
		return `[${formattedToday}]`;
	}

	private formatNumber(num: number): string {
		if (num < 10)  {
			return '0' + num;
		} else {
			return num.toString();
		}
	}

	private _level: LogLevel;
	private _output: vscode.OutputChannel;
}