import * as vscode from 'vscode';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import moment = require('moment');

import { RegExpHelper } from '../../helpers/regExpHelper';
import { Configuration } from '../../models/configuration';
import { BaseWebViewController, WebViewMessage } from '../baseWebViewController';
import { CorrGraphRunner } from '../corrGraphRunner';
import { DialogHelper } from '../../helpers/dialogHelper';
import { TestHelper } from '../../helpers/testHelper';
import { ExceptionHelper } from '../../helpers/exceptionHelper';
import { WebViewCommand } from '../webViewCommands';
import { Enveloper } from '../../models/enveloper';
import { Log } from '../../extension';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { OperationCanceledException } from '../../models/operationCanceledException';
import { ContentHelper } from '../../helpers/contentHelper';
import { DateHelper } from '../../helpers/dateHelper';


export class CorrelateEventsCommand extends WebViewCommand {
	constructor(message: WebViewMessage) {
		super(CorrelateEventsCommand.name, message);
	}

	public async execute(controller: BaseWebViewController) {
        const params = (this.message.params as any);
        const tmpDirPath = params.tmpDirPath;

        if(!fs.existsSync(tmpDirPath)) {
            DialogHelper.showWarning("Не загружены evtx-файлы событий. Загрузите evtx-файлы и повторите");
            return;
        }

        const config = Configuration.get();
        const rootPaths = config.getContentRoots();

        // Прогоняем событие по графам для каждой из корневых директорий текущего режима
        for(const rootPath of rootPaths) {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                cancellable: true,
            }, async (progress, cancellationToken) => {
                try {
                    progress.report({
                        message: "Конвертация событий в нужный формат"
                    });

                    Log.info(`Для корреляции событий используется json-файлы сырых событий из директории ${tmpDirPath}`);

                    const envelopedEventsFilePath = path.join(tmpDirPath, CorrelateEventsCommand.ENVELOPED_EVENTS_FILENAME);

                    // Удаляем файл для результирующих событий в конверте.
                    let envelopedEventsCounter = 0;
                    let userDecision: string;
                    if(fs.existsSync(envelopedEventsFilePath)) {
                        userDecision = await DialogHelper.showInfo(
                            "Обнаружен объединенный файл с событиями в конвертах, подготовленные для корреляции. Хотите использовать его для корреляции или обновить его?",
                            this.USE_OLD,
                            this.RECREATE_NEW);
                
                        if(!userDecision) {
                            throw new OperationCanceledException("Операция отменена");
                        }
                        
                        switch(userDecision) {
                            case this.RECREATE_NEW: {
                                await fs.promises.unlink(envelopedEventsFilePath);
                                Log.info(`Общий файл ${envelopedEventsFilePath} для результирующих событий в конверте удалён`);
                                break;
                            }

                            case this.USE_OLD: {
                                envelopedEventsCounter = await FileSystemHelper.getLinesCount(envelopedEventsFilePath) - 1;
                                break;
                            }
                        }
                    }

                    // Если сохраненных событий еще нет или их надо перезаписать.
                    if(!userDecision || userDecision === this.RECREATE_NEW) {
                        const startEnveloping = moment();
                    
                        // Конвертируем в JSON события и оборачиваем в конверт.
                        const jsonFilePaths = (await FileSystemHelper.readFilesFromDirectory(tmpDirPath)).filter(f => f.endsWith(".json"));
                        for(const jsonFilePath of jsonFilePaths) {
                            Log.info(`Начата обработка файла ${jsonFilePath}`);
                            envelopedEventsCounter += await Enveloper.streamEnvelopeJsonlEvents(jsonFilePath, envelopedEventsFilePath, "utf8");
    
                            Log.info(`События из файла ${jsonFilePath} обёрнуты в конверт и добавлены в файл ${envelopedEventsFilePath}`);
                        }
    
                        // Фиксируем сколько времени ушло на корреляцию.
                        const endEnveloping = moment();
                        Log.info(`Преобразования из xml в json и добавление конверта заняло ${DateHelper.formatDuration(startEnveloping, endEnveloping)}`);
                        Log.info(`Всего подготовлено ${envelopedEventsCounter} событий для корреляции`);
                    }

                    if(cancellationToken.isCancellationRequested) {
                        throw new OperationCanceledException();
                    }

                    progress.report({
                        message: `Идёт корреляция ${envelopedEventsCounter} извлеченных событий`
                    });

                    const startCorrelation = moment();
                    const runner = new CorrGraphRunner({
                        config : config,
                        cancellationToken: cancellationToken,

                        forceNormalizationsGraphBuilding: false,
                        forceTablesSchemaBuilding: false,
                        forceTablesDbBuilding: false,
                        forceCorrelationsGraphBuilding: false,
                        forceEnrichmentsGraphBuilding: false,
                        forceLocalizationsBuilding: false
                    });
                    let correlatedEventsString = await runner.run(rootPath, envelopedEventsFilePath);

                    // Исключаем сабрули
                    const filteredCorrelatedEvents: any[] = [];
                    try {
                        const correlatedEventLines = correlatedEventsString.split(os.EOL).filter(l => l !== "");
                        for(const correlatedEventLine of correlatedEventLines) {
                            const correlatedEvent = JSON.parse(correlatedEventLine);
                            if(correlatedEvent?.correlation_type === "subrule") {
                                continue;
                            }

                            filteredCorrelatedEvents.push(correlatedEvent);
                        }

                        filteredCorrelatedEvents
                            .sort(ContentHelper.comparerEventsByCorrelationType)
                            .slice(0, this.MAX_NUMBER_OF_OUTPUT_CORRELATION);

                        correlatedEventsString = filteredCorrelatedEvents.map(fce => JSON.stringify(fce)).join(os.EOL);
                    }
                    catch(error) {
                        DialogHelper.showError("Не удалось исключить подправила (subrules) из корреляционных событий", error);
                    }

                    // Фиксируем сколько времени ушло на корреляцию.
                    const endCorrelation = moment();

                    if(!correlatedEventsString) {
                        DialogHelper.showInfo(`По загруженным событиям не произошло ни одной сработки корреляции. Потребовалось ${DateHelper.formatDuration(startCorrelation, endCorrelation)}`);
                        return;
                    }
                    
                    // Извлекаем имена сработавших корреляций.
                    const correlationNames = RegExpHelper.getAllStrings(correlatedEventsString, /"correlation_name"\s*:\s*"(.*?)"/g);
                    if(!correlationNames) {
                        DialogHelper.showError(`Корреляционные события не были получены. Потребовалось ${DateHelper.formatDuration(startCorrelation, endCorrelation)}`);
                        return;
                    }

                    // Отдаем события во front-end.
                    const formattedEvents = TestHelper.formatTestCodeAndEvents(correlatedEventsString);
                    const cleanedEvents = TestHelper.cleanTestCode(formattedEvents);
					
                    controller.view.webview.postMessage({
                        command : "correlatedEvents",
                        events : cleanedEvents            
                    });

   
                    DialogHelper.showInfo(`Корреляция заняла ${DateHelper.formatDuration(startCorrelation, endCorrelation)} минут, сработало ${correlationNames.length} корреляций(ия)`);
                }
                catch(error) {
                    ExceptionHelper.show(error, "Ошибка корреляции событий");
                }
            });
        }
	}

    public static readonly ENVELOPED_EVENTS_FILENAME = "all_enveloped_events.jsonl";

    public readonly USE_OLD = "Использовать";
    public readonly RECREATE_NEW = "Удалить";

    public readonly MAX_NUMBER_OF_OUTPUT_CORRELATION = 100;
}