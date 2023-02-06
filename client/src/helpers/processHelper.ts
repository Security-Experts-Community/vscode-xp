import * as vscode from 'vscode';
import * as fs from 'fs';
import * as child_process from 'child_process';

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
			throw new Error(`Ошибка запуска внешнего процесса '${command}'. ` + childProcess.stderr);
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

	
	/**
	 * Позволяет собрать сложную команду в виде запускаемого модуля и списка параметров *без экранирования*
	 * @param command базовая команда для запуска процесса
	 * @param args список параметров, которые не надо экранировать
	 * @param encoding кодировка вывода от команды
	 * @returns строковый вывод запускаемого процесса
	 */
	public static readProcessArgsOutput(command: string, args: string[], encoding: BufferEncoding) {
		// const commandWithArgs = command + " " + args.join(" ");
		ProcessHelper.run_script(
			command, 
			args,
			function(output, exit_code) {
				console.log("Process Finished.");
				console.log('closing code: ' + exit_code);
				console.log('Full output of script: ',output);
				return output;
			}
		);
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

	private static run_script(command : string, args : string [], callback) {
		console.log("Starting Process.");
		const child = child_process.spawn(command, args);
	
		let scriptOutput = "";
	
		child.stdout.setEncoding('utf8');
		child.stdout.on('data', function(data) {
			console.log('stdout: ' + data);
			data=data.toString();
			scriptOutput+=data;
		});
	
		child.stderr.setEncoding('utf8');
		child.stderr.on('data', function(data) {
			console.log('stderr: ' + data);
			data=data.toString();
			scriptOutput+=data;
		});
	
		child.on('close', function(code) {
			callback(scriptOutput, code);
		});
	}

	public static Execute(command : string) : Promise<string> {

		return new Promise(function(resolve, reject) {
			console.log("Starting Process.");
			let child; 
			try {
				child = child_process.spawn(command);
			} 
			catch(error) {
				reject(error.message);
				return;
			}
		
			let scriptOutput = "";
		
			child.stdout.setEncoding('utf8');
			child.stdout.on('data', function(data) {
				console.log('stdout: ' + data);
				scriptOutput += data.toString();
			});

			child.stdout.setEncoding('utf8');
			child.stdout.on("error", function(data) {
				console.log('stdout: ' + data);
				scriptOutput += data.toString();
			});
		
			child.stderr.setEncoding('utf8');
			child.stderr.on('data', function(data) {
				console.log('stderr: ' + data);
				data=data.toString();
				scriptOutput+=data;
			});
		
			child.on('close', function(code) {
				resolve(scriptOutput);
			});
		});
	}

	public static ExecuteWithArgs(command : string, params : string[]) : Promise<string> {

		return new Promise(function(resolve, reject) {
			console.log("Starting Process.");
			let child; 
			try {
				child = child_process.spawn(command, params);
			} 
			catch(error) {
				reject(error.message);
				return;
			}
		
			let scriptOutput = "";
		
			child.stdout.setEncoding('utf8');
			child.stdout.on('data', function(data) {
				console.log('stdout: ' + data);
				scriptOutput += data.toString();
			});

			child.stdout.setEncoding('utf8');
			child.stdout.on("error", function(data) {
				console.log('stdout: ' + data);
				scriptOutput += data.toString();
			});
		
			child.stderr.setEncoding('utf8');
			child.stderr.on('data', function(data) {
				console.log('stderr: ' + data);
				data=data.toString();
				scriptOutput+=data;
			});
		
			child.on('close', function(code) {
				resolve(scriptOutput);
			});
		});
	}

	public static ExecuteWithArgsWithRealtimeOutput(command : string, params : string[], outputChannel : vscode.OutputChannel) : Promise<string> {

		return new Promise(function(resolve, reject) {
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
				outputChannel.append(data.toString());
			});

			child.stdout.setEncoding('utf8');
			child.stdout.on("error", function(data) {
				outputChannel.append(data.toString());
				output += data.toString();
			});
		
			child.stderr.setEncoding('utf8');
			child.stderr.on('data', function(data) {
				outputChannel.append(data.toString());
				output += data.toString();
			});
		
			child.on('close', function(code) {
				resolve(output);
			});
		});
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
			throw new Error(`Ошибка запуска внешнего процесса '${command}'. ` + childProcess.stderr);
		}

		return childProcess.stdout;
	}
}
