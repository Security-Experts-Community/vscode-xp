import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PromisePool } from '@supercharge/promise-pool';

import { Configuration } from '../../models/configuration';
import { BaseWebViewController, WebViewMessage } from '../baseWebViewController';
import { DialogHelper } from '../../helpers/dialogHelper';
import { WebViewCommand } from '../webViewCommands';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { ExecutionResult, ProcessHelper } from '../../helpers/processHelper';
import { Log } from '../../extension';
import moment = require('moment');

import { OsType } from '../../models/locator/pathLocator';
import { DateHelper } from '../../helpers/dateHelper';


export class AppendEventMessage implements WebViewMessage {
	cmdName: string;
	message: string;
	params?: unknown;
	public get xmlEventsFilePath(): string  {
		const params = (this.params as any);
		return params.xmlEventsFilePath as string;
	}

	public get getTmpDir(): string  {
		const params = (this.params as any);
		return params.tmpDirPath as string;
	}
}

export class AppendEventsCommand extends WebViewCommand<AppendEventMessage> {
	constructor(message: AppendEventMessage) {
		super(AppendEventsCommand.name, message);
	}

	public async execute(controller: BaseWebViewController) {
        // Выбор либо одной директории либо одного файла.
        const showOpenDialogUris = await vscode.window.showOpenDialog({
			canSelectMany: true, 
			canSelectFolders: true,
            canSelectFiles: true,
            filters: {
                Evtx: ['evtx']
            }
		});

		if(!showOpenDialogUris || showOpenDialogUris.length != 1) {
			return;
		}

        // Либо один выбранный путь это путь к файлу, либо директории.        
        const selectedPath = showOpenDialogUris[0].fsPath;
        const lstat = await fs.promises.lstat(selectedPath);
        const isFile = lstat.isFile();

		const openEventsDirectoryPath = showOpenDialogUris[0].fsPath;
        if(!fs.existsSync(openEventsDirectoryPath)) {
            DialogHelper.showWarning(`Не удалось открыть директорию ${openEventsDirectoryPath}`);
            return;
        }

        if(Configuration.get().getOsType() !== OsType.Windows) {
            DialogHelper.showWarning(`Данная функциональность поддерживается только на платформе Windows`);
            return;
        }

        const evtxToJsonToolFullPath = Configuration.get().getEvtxToJsonToolFullPath();
        if(!fs.existsSync(evtxToJsonToolFullPath)) {
            DialogHelper.showError(`Утилита для конвертации evtx файлов в json не найдена по пути '${evtxToJsonToolFullPath}'`);
            return;
        }

        const tmpDirPath = this.message.getTmpDir;
        const jsonFiles = FileSystemHelper.readFilesNameFilter(tmpDirPath, /.+?\.json$/g);

        let userDecision = "";
        if(jsonFiles.length !== 0) {
            userDecision = await DialogHelper.showInfo(
                "Добавить новые evtx-файлы к старым или удалить все старые", 
                AppendEventsCommand.ADD,
                AppendEventsCommand.REMOVE);
        }

		return vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: true,
		}, async (progress, cancellationToken) => {

            if(userDecision === AppendEventsCommand.REMOVE) {
                await FileSystemHelper.deleteAllSubDirectoriesAndFiles(tmpDirPath);
            }

            progress.report({message: `Предварительная обработка evtx-файлов`});
            const start = moment();
            let evtxFilePaths: string [] = [];

            // Либо один выбранный путь это путь к файлу, либо директории.
            if(!isFile) {
                evtxFilePaths = FileSystemHelper
                .getRecursiveFilesSync(openEventsDirectoryPath)
                .filter(fp => fp.toLocaleLowerCase().endsWith(".evtx"));
                progress.report({message: `Предварительная обработка ${evtxFilePaths.length} evtx-файлов`});
            } else {
                evtxFilePaths = [selectedPath];
                progress.report({message: `Предварительная обработка evtx-файла`});
            }
    
            const cpuCores = os.cpus().length;
            Log.info(`Запущен пул обработки событий из evtx-файлов на ${cpuCores} параллельных задач для ${evtxFilePaths.length} файлов`);
            
            const { results, errors } = await PromisePool
                .withConcurrency(cpuCores)
                .for(evtxFilePaths)
                .process(async (evtxFilePath, index, pool) => {
                    // progress.report({increment: index});
                    const executionResult = await AppendEventsCommand.processSingleEvtx(evtxFilePath, tmpDirPath, cancellationToken);
                    return executionResult;
                });

            if(results.some(r => r.isInterrupted)) {
                DialogHelper.showInfo(`Операция была прервана пользователем`);
                return;
            }

            if(results.some(r => r.exitCode !== 0)) {
                Log.warn(`Выполнение хотя бы одной команды завершилось с кодом ошибки, отличным от 0`);
            }

            const end = moment();
            DialogHelper.showInfo(`За ${DateHelper.formatDuration(start, end)} было добавлено ${evtxFilePaths.length} файл(ов)`);
        });
	}

    private static async processSingleEvtx(evtxFilePath: string, getTmpDir: string, cancellationToken: vscode.CancellationToken ) : Promise<ExecutionResult>{
        const jsonFileName = path.basename(evtxFilePath) + ".json";
        const currJsonFilePath = path.join(getTmpDir, jsonFileName);

        const evtxToJsonToolFullPath = Configuration.get().getEvtxToJsonToolFullPath();

        Log.info(`Начата обработка файла ${evtxFilePath}`);
        const start = moment();

        const processResult = await ProcessHelper.execute(
            evtxToJsonToolFullPath, 
            [
                "-e",
                evtxFilePath,
                "-j",
                currJsonFilePath
            ], {
                cancellationToken: cancellationToken,
            }
        );

        const end = moment();
        Log.info(`Завершена обработка файла ${evtxFilePath} за ${DateHelper.formatDuration(start, end)}`);  
        return processResult;
    }

    public static REMOVE = "Удалить";
    public static ADD = "Добавить";
}