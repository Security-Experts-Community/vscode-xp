import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { MustacheFormatter } from '../mustacheFormatter';
import { ExtensionHelper } from '../../helpers/extensionHelper';
import { RuleBaseItem } from '../../models/content/ruleBaseItem';
import { Configuration } from '../../models/configuration';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { CorrGraphRunner } from './corrGraphRunner';
import { RegExpHelper } from '../../helpers/regExpHelper';
import { ExceptionHelper } from '../../helpers/exceptionHelper';
import { EventMimeType, TestHelper } from '../../helpers/testHelper';
import { Enveloper } from '../../models/enveloper';

export class RunningCorrelationGraphProvider {

    public static viewId = 'RunningEventsOnCorrelationGraphView';

    private static showView = 'KnowledgebaseTree.runningCorrelationGraph';

    private constructor(
        private readonly _config: Configuration,
        private readonly _formatter: MustacheFormatter
    ) {}

    public static init(config : Configuration) : void {

        // Форма создания корреляции.
        const createCorrelationTemplateFilePath = path.join(
            config.getExtensionPath(), "client", "templates", "FullGraphRun.html");

        const reateCorrelationTemplateContent = fs.readFileSync(createCorrelationTemplateFilePath).toString();
        const createCorrelationViewProvider = new RunningCorrelationGraphProvider(
            config,
            new MustacheFormatter(reateCorrelationTemplateContent));

        config.getContext().subscriptions.push(
            vscode.commands.registerCommand(
                RunningCorrelationGraphProvider.showView,
                async (selectedItem: RuleBaseItem) => {
                    return createCorrelationViewProvider.showView();
                }
            )
        );
    }

    private showView() {

        // Создать и показать панель.
        this._view = vscode.window.createWebviewPanel(
            RunningCorrelationGraphProvider.viewId,
            'Скоррелировать события',
            vscode.ViewColumn.One,
            {
                retainContextWhenHidden : true,
                enableFindWidget : true
            });

        this._view.webview.options = {
            enableScripts: true
        };

        this._view.webview.onDidReceiveMessage(
            this.receiveMessageFromWebView,
            this
        );

        const resoucesUri = this._config.getExtensionUri();
		const extensionBaseUri = this._view.webview.asWebviewUri(resoucesUri);
        try {
            const templateDefaultContent = {
                "ExtensionBaseUri" : extensionBaseUri
            };

            const htmlContent = this._formatter.format(templateDefaultContent);
            this._view.webview.html = htmlContent;
        }
        catch (error) {
            ExtensionHelper.showError("Не удалось отобразить шаблон правила корреляции.", error);
        }
    }

    private async receiveMessageFromWebView(message: any) {
		switch (message.command) {
			case 'runFullGraph': {
                const rawEvents = message.rawEvents;

                if(!rawEvents) {
                    ExtensionHelper.showUserError("Добавьте сырые события и повторите действие.");
                    return;
                }             
				await this.corrGraphRun(rawEvents);
                break;
			}
            case 'addEnvelope': {
				const rawEvents = message?.rawEvents as string;
				const mimeType = message?.mimeType as EventMimeType;
                
				return this.addEnvelope(rawEvents, mimeType);
			}
        }
    }

    private async corrGraphRun(rawEvents: string) : Promise<void> {

        const config = Configuration.get();
        const rootPaths = config.getContentRoots();

        // Прогоняем событие по графам для каждой из корневых директорий теущего режима
        rootPaths.forEach(rootPath => {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                cancellable: false,
                title: `Корреляция нормализованных событий с использованием графа для директории ${path.basename(rootPath)}`
            }, async (progress) => {
                try {
                    const rootFolder = path.basename(rootPath);

                     // Создаем временную директорию.
                    const tmpDirectoryPath = this._config.getRandTmpSubDirectoryPath(rootFolder);
                    await fs.promises.mkdir(tmpDirectoryPath, {recursive : true});

                    // Сохраняет сырые события в конверте на диск.
                    const rawEventsFilePath = path.join(tmpDirectoryPath, "raw_events.json");
                    await FileSystemHelper.writeContentFile(rawEventsFilePath, rawEvents);

                    const runner = new CorrGraphRunner(this._config);
                    const correlatedEventsString = await runner.run(rootPath, rawEventsFilePath);

                    if(!correlatedEventsString) {
                        ExtensionHelper.showUserInfo(`По этим событиям не произошло ни одной сработки корреляции из папки ${rootFolder}.`);
                        return;
                    }
                    
                    // Извлекаем имена сработавших корреляций.
                    const correlationNames = RegExpHelper.getAllStrings(correlatedEventsString, /("correlation_name"\s*:\s*"(.*?)")/g);
                    if(!correlationNames) {
                        ExtensionHelper.showUserError(`Не удалось скоррелировать нормализованные события с использованием графа для директории ${path.basename(rootPath)}.`);
                        return;
                    }

                    ExtensionHelper.showUserInfo(`Количество сработавших корреляций из папки ${rootFolder}: ${correlationNames.length}`);

                    // Отдаем события во front-end.
                    const formatedEvents = TestHelper.formatTestCodeAndEvents(correlatedEventsString);
                    const cleanedEvents = TestHelper.cleanTestCode(formatedEvents);
                    this._view.webview.postMessage( {
                        command : "correlatedEvents",
                        events : cleanedEvents            
                    });
                }
                catch(error) {
                    ExceptionHelper.show(error);
                    this._config.getOutputChannel().show();
                }
            });
        });
	}

	public async addEnvelope(rawEvents: string, mimeType: EventMimeType) {
		
		let envelopedRawEventsString : string;
		try {
			envelopedRawEventsString = await Enveloper.addEnvelope(rawEvents, mimeType);
		}
		catch(error) {
			ExceptionHelper.show(error, "Ошибка добавления конверта.");
			return;
		}

		this._view.webview.postMessage({
			'command': 'updateRawEvents',
			'rawEvents': envelopedRawEventsString
		});
	}


    private _view: vscode.WebviewPanel;
}