import * as vscode from 'vscode';
import * as fs from 'fs';
import * as child_process from 'child_process';
import * as iconv from 'iconv';

type EncodingType = "windows-1251" | "utf-8"


export interface ExecutionProcessOptions {
	encoding: EncodingType;
	outputChannel : vscode.OutputChannel;
}

export class ExecutionResult {
	output: string;
	exitCode : number;
}

export class ProcessHelper {
	public static readProcessPathArgsOutputSync(command: string, args: string[], encoding: BufferEncoding) : string {
		const childProcess = child_process.spawnSync(
			command,
			args, {
				shell: true,
				cwd: process.cwd(),
				env: process.env,
				stdio: 'pipe',
				encoding
			}
		);

		if(childProcess.status != 0) {
			throw new Error(`Не удалось запустить внешний процесс '${command}'. \n` + childProcess.stderr);
		}

		return childProcess.stdout;
	}

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

	
	public static StdIOExecuteWithArgsWithRealtimeOutput(
		filePath: string, 
		command : string, params : string[], 
		outputChannel : vscode.OutputChannel) : Promise<string> {

		return new Promise(function(resolve, reject) {

			const file = fs.readFileSync(filePath);
			
			let child; 
			try {
				child = child_process.spawn(command, params);
			} 
			catch(error) {
				reject(error.message);
				return;
			}

			child.stdin.write(file);
			child.stdin.end();
		
			let output = "";
		
			child.stdout.setEncoding('utf8');
			child.stdout.on('data', function(data) {
				output += data.toString();
				//outputChannel.append(data.toString());
			});

			child.stdout.setEncoding('utf8');
			child.stdout.on("error", function(data) {
				outputChannel.append(data.toString());
				output += data.toString();
			});
		
			child.stderr.setEncoding('utf8');
			child.stderr.on('data', function(data) {
				outputChannel.append(data.toString());
				reject(data.toString());				
			});
		
			child.on('close', function(code) {
				resolve(output);
			});
		});
	}	

	public static executeWithArgsWithRealtimeOutput(command : string, params : string[], outputChannel : vscode.OutputChannel) : Promise<string> {

		return new Promise(function(resolve, reject) {
			let child : child_process.ChildProcessWithoutNullStreams;
			// Вывод пополныемой команды для локализациии ошибки.
			outputChannel.append(`${command} ${params.join(' ')} `);
			try {
				child = child_process.spawn(command, params);
			} 
			catch(error) {
				reject(error.message);
				return;
			}
		
			let output = "";
		
			child.stdout.on('data', function(data : Buffer) {
				// const body = new Buffer(data, 'binary');
				const conv = iconv.Iconv('windows-1251', 'utf8');
				const convertedData = conv.convert(data).toString();

				// const someEncodedString = Buffer.from(data, ).toString();
				outputChannel.append(convertedData);
				output += convertedData;
			});

			// child.stdout.setEncoding('utf8');
			child.stdout.on("error", function(data: Buffer) {
				const conv = iconv.Iconv('windows-1251', 'utf8');
				const convertedData = conv.convert(data).toString();

				outputChannel.append(convertedData);
				output += convertedData;
			});
		
			///child.stderr.setEncoding('utf8');
			child.stderr.on('data', function(data: Buffer) {
				const conv = iconv.Iconv('windows-1251', 'utf8');
				const convertedData = conv.convert(data).toString();

				outputChannel.append(convertedData);
				output += convertedData;
			});
		
			child.on('close', function(code) {
				resolve(output);
			});
		});
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

	public static ExecuteWithArgsWithRealtimeEmmiterOutput(command : string, params : string[], emmiter : vscode.EventEmitter<string>) : Promise<string> {

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
		const conv = iconv.Iconv(inputEncoding, 'utf8');
		const encodedData = conv.convert(data).toString();
		return encodedData;
	}
		
	public static readProcessOutputSync(command: string,encoding: BufferEncoding) : string {
		const childProcess = child_process.spawnSync(
			command,
			{
				shell: true,
				cwd: process.cwd(),
				env: process.env,
				stdio: 'pipe',
				encoding
			}
		);

		if(childProcess.status != 0) {
			throw new Error(`Не удалось запустить внешний процесс '${command}'. \n` + childProcess.stderr);
		}

		return childProcess.stdout;
	}
}
