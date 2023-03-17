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
import { TestHelper } from '../../helpers/testHelper';

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
            ExtensionHelper.getExtentionPath(), "client", "templates", "FullGraphRun.html");

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
            'Прогон событий на графе корреляций',
            vscode.ViewColumn.One,
            {retainContextWhenHidden : true});

        this._view.webview.options = {
            enableScripts: true
        };

        this._view.webview.onDidReceiveMessage(
            this.receiveMessageFromWebView,
            this
        );

        const resoucesUri = this._config.getExtentionUri();
		const extensionBaseUri = this._view.webview.asWebviewUri(resoucesUri);
        try {
            const templateDefaultContent = {
                "ExtensionBaseUri" : extensionBaseUri
            };

            const htmlContent = this._formatter.format(templateDefaultContent);
            this._view.webview.html = htmlContent;
        }
        catch (error) {
            ExtensionHelper.showError("Ошибка отображения шаблона корреляции.", error);
        }
    }

    private async receiveMessageFromWebView(message: any) {
		switch (message.command) {
			case 'runFullGraph': {
                const rawEvents = message.rawEvents;

                if(!rawEvents) {
                    ExtensionHelper.showUserError("Не заполнено поле сырых событий. Заполните его и повторите.");
                    return;
                }

                // Создаем временную директорию.
                const tmpDirectoryPath = this._config.getRandTmpSubDirectoryPath();
                await fs.promises.mkdir(tmpDirectoryPath, {recursive : true});

                // Сохраняет сырые события в конверте на диск.
                const rawEventsFilePath = path.join(tmpDirectoryPath, "raw_events.json");
                await FileSystemHelper.writeContentFile(rawEventsFilePath, rawEvents);

				await this.corrGraphRun(rawEventsFilePath);
                break;
			}
            case 'addEnvelope': {
				return this.addEnvelope(message);
			}
        }
    }

    private async corrGraphRun(rawEventsPath: string) : Promise<void> {

        const kbPaths = Configuration.get().getPathHelper();
        const roots = kbPaths.getContentRoots();

        // Прогоняем событие по графам для каждой из корневых директорий теущего режима
        roots.forEach(root => {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                cancellable: false,
                title: `Прогон событий по графу корреляций для директории ${path.basename(root)}`
            }, async (progress) => {
                try {
                    const runner = new CorrGraphRunner(this._config);
                    const correlatedEventsString = await runner.run(root, rawEventsPath);

                    if(!correlatedEventsString) {
                        ExtensionHelper.showUserInfo("По данным событиям не произошло ни одной сработки.");
                        return;
                    }
                    
                    // Извлекаем имена сработавших корреляций.
                    const correlationNames = RegExpHelper.getAllStrings(correlatedEventsString, /(\"correlation_name"\s*:\s*\"(.*?)\")/g);
                    if(!correlationNames) {
                        ExtensionHelper.showUserError("Ошибка прогона событий по графу корреляции.");
                        return;
                    }

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

	private async addEnvelope(message: any) {
		
		let rawEvents = message?.rawEvents as string;
		if(!rawEvents) {
			return ExtensionHelper.showUserInfo("Не заданы сырые события для теста. Добавьте их и повторите.");
		}

		rawEvents = rawEvents.trim();
		if(TestHelper.isEnvelopedEvents(rawEvents)) {
			return ExtensionHelper.showUserInfo("Конверт для событий уже добавлен.");
		}

		const mimeType = message?.mimeType as string;
		if(!mimeType) {
			ExtensionHelper.showUserInfo("Не задан mime. Добавьте задайте его и повторите.");
			return;
		}

		// Сжали список событий и обернули в конверт.
		const compressedRawEvents = TestHelper.compressRawEvents(rawEvents);
		const envelopedRawEvents = TestHelper.addEnvelope(compressedRawEvents, mimeType);
		const envelopedRawEventsString = envelopedRawEvents.join('\n');

		this._view.webview.postMessage({
			'command': 'updateRawEvents',
			'rawEvents': envelopedRawEventsString
		});
	}

    // private async normalizeRawEvents(rawEvents: string) : Promise<void> {

	// 	const kbDirPath = KbHelper.getKbPaths().getPackagesPath();

	// 	vscode.window.withProgress({
	// 		location: vscode.ProgressLocation.Notification,
	// 		cancellable: false,
	// 	}, async (progress) => {
    //         let rawEventsFilePath: fs.PathLike;
	// 		try {
    //             progress.report( {
    //                 message: "Нормализация событий"
    //             });

    //             // Создаем временную директорию.
    //             const tmpDirectoryPath = this._config.getRandTmpSubDirectoryPath();
    //             await fs.promises.mkdir(tmpDirectoryPath);

    //             // Сохраняет сырые события в конверте на диск.
    //             rawEventsFilePath = path.join(tmpDirectoryPath, "raw_events.json");
    //             await FileSystemHelper.writeContentFile(rawEventsFilePath, rawEvents)

	// 			const normalizer = new Normalizer(this._config);
	// 			const normEvents = await normalizer.Normalize(kbDirPath, rawEventsFilePath);
	
	// 			if(!normEvents) {
	// 				ExtensionHelper.showUserError("Ошибка нормализации событий.");
	// 				return;
	// 			}
	// 		}
	// 		catch(error) {
    //             const errorType = error.constructor.name;
    //             switch(errorType)  {
    //                 case "XpExtentionException" :  {
    //                     const typedError = error as XpExtentionException;
    //                     ExtensionHelper.showError(typedError.message, error.message);
    //                 }
    //                 default: {
    //                     ExtensionHelper.showError("Не удалось нормализовать событие.", error.message);
    //                 }
    //             }
				
	// 			this._config.getOutputChannel().show();
	// 			return;
	// 		}
	// 	});
	// }

    private _view: vscode.WebviewPanel;
}