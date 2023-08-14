import * as vscode from 'vscode';
import * as fs from 'fs';
import * as child_process from 'child_process';
import * as iconv from 'iconv-lite';

import { EncodingType } from '../models/configuration';

export interface ExecutionProcessOptions {
	encoding: EncodingType;
	outputChannel : vscode.OutputChannel;
	token?: vscode.CancellationToken
}

export class ExecutionResult {
	output: string;
	exitCode : number;
	isInterrupted  = false;
}

export class ProcessHelper {
	/**
	 * Позволяет собрать сложную команду в виде запускаемого модуля и списка параметров *без экранирования*
	 * @param command базовая команда для запуска процесса
	 * @param args список параметров, которые не надо экранировать
	 * @param encoding кодировка вывода от команды
	 * @returns строковый вывод запускаемого процесса
	 */
	public static readProcessArgsOutputSync(command: string, args: string[], encoding: BufferEncoding) : string {
		const argsString = command + " " + args.join(" ");
		const childProcess = child_process.spawnSync(
			argsString,
			{
				shell: true,
				cwd: process.cwd(),
				env: process.env,
				stdio: 'pipe',
				encoding
			}
		);

		if(childProcess.status != 0) {
			return childProcess.stdout;
		}

		return childProcess.stdout;
	}

	public static execute(command : string, params : string[], options: ExecutionProcessOptions ) : Promise<ExecutionResult> {

		return new Promise(function(resolve, reject) {
			let child : child_process.ChildProcessWithoutNullStreams;
			// Вывод пополныемой команды для локализациии ошибки.
			if(options.outputChannel) {
				options.outputChannel.append(`${command} ${params.join(' ')} `);
			}
			
			try {
				child = child_process.spawn(command, params);
			} 
			catch(error) {
				reject(error);
				return;
			}
		
			const executionResult : ExecutionResult = new ExecutionResult();
			executionResult.output = "";

			if(options.token) {
				options.token.onCancellationRequested( (e) => {
					child.kill();
					executionResult.exitCode = child.exitCode;
					executionResult.isInterrupted = true;
					resolve(executionResult);
				});
			}

			if(!options.encoding) {
				options.encoding = "utf-8";
			}
		
			child.stdout.on('data', function(data : Buffer) {
				const encodedData = ProcessHelper.encodeOutputToString(data, options.encoding);
				executionResult.output += encodedData;

				if(options.outputChannel) {
					options.outputChannel.append(encodedData);
				}
			});

			child.stdout.on("error", function(exception : Error) {
				const encodedData = exception.toString();
				executionResult.output += encodedData;

				if(options.outputChannel) {
					options.outputChannel.append(encodedData);
				}
			});
		
			child.on('close', function(code : number) {
				executionResult.exitCode = code;
				resolve(executionResult);
			});
		});
	}

	public static executeWithArgsWithRealtimeEmmiterOutput(command : string, params : string[], emmiter : vscode.EventEmitter<string>) : Promise<string> {

		return new Promise(function(resolve, reject) {
			
			// Записываем в лог выполнения строку запуска
			emmiter.fire(`\n\nXP :: Run command: ${command} ${params.join(' ')}\n`);

			let child; 
			try {
				child = child_process.spawn(command, params);
			} 
			catch(error) {
				reject(error.message);
				return;
			}
		
			let output = "";
		
			child.stdout.setEncoding('utf8');
			child.stdout.on('data', function(data) {
				output += data.toString();
				emmiter.fire(data.toString());
			});

			child.stdout.setEncoding('utf8');
			child.stdout.on("error", function(data) {
				emmiter.fire(data.toString());
				output += data.toString();
			});
		
			child.stderr.setEncoding('utf8');
			child.stderr.on('data', function(data) {
				emmiter.fire(data.toString());
				output += data.toString();
			});
		
			child.on('close', function(code) {
				resolve(output);
			});
		});
	}

	private static encodeOutputToString(data: Buffer, inputEncoding: EncodingType) {
		return iconv.decode(data, inputEncoding, {defaultEncoding: 'utf-8'});
	}
}
