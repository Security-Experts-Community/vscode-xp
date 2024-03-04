import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as classTransformer from 'class-transformer';

import { MustacheFormatter } from '../mustacheFormatter';
import { Configuration } from '../../models/configuration';
import { BaseWebViewController, WebViewDescriptor, WebViewMessage } from '../baseWebViewController';
import { Log } from '../../extension';
import { CorrelateEventsCommand } from './correlateEventsCommand';
import { AppendEventMessage, AppendEventsCommand } from './appendEventCommand';


export class RetroCorrelationViewController extends BaseWebViewController {

    public static viewId = 'xp.retroCorrelation';
    public static showViewCommand = 'xp.retroCorrelationShow';

    private constructor(
		descriptor : WebViewDescriptor,
        private readonly _formatter: MustacheFormatter
    ) {
		super(descriptor);
	}

    public static async init(config : Configuration) : Promise<void> {

        // Форма создания корреляции.
        const createCorrelationTemplateFilePath = path.join(config.getExtensionPath(), "client", "src", "views", "retroCorrelation", "retroCorrelation.html");
        const createCorrelationTemplateContent = (await fs.promises.readFile(createCorrelationTemplateFilePath)).toString();

        const view = new RetroCorrelationViewController(
            {
				config : config,
				templatePath: createCorrelationTemplateFilePath,
				viewId: RetroCorrelationViewController.viewId,
				viewTitle: config.getMessage("View.LogCorrelation"),
				webViewOptions: {
					retainContextWhenHidden: true,
					enableCommandUris : true,
					enableScripts: true,
					enableFindWidget: true,
				}
			},
            new MustacheFormatter(createCorrelationTemplateContent)
		);

        config.getContext().subscriptions.push(
            vscode.commands.registerCommand(
                RetroCorrelationViewController.showViewCommand,
                async () => {
                    return view.show();
                }
            )
        );
    }

	protected async preShow() : Promise<void> {
		this._tmpDirPath = this._descriptor.config.getRandTmpSubDirectoryPath();
		this._xmlEventsFilePath = path.join(this._tmpDirPath, RetroCorrelationViewController.XML_EVENTS_FILENAME);
		
		await fs.promises.mkdir(this._tmpDirPath, {recursive : true});
		return;
	}

	protected getHtml(): string {
        const resourcesUri = this._descriptor.config.getExtensionUri();
		const extensionBaseUri = this.view.webview.asWebviewUri(resourcesUri);
		const templateDefaultContent = {
			"ExtensionBaseUri" : extensionBaseUri
		};

		const htmlContent = this._formatter.format(templateDefaultContent);
		return htmlContent;
	}

    protected async receiveMessageFromWebView(message: WebViewMessage) : Promise<void> {
		switch (message.cmdName) {
            case "AppendEventsCommand": {
				// TODO: подумать над улучшением представления команд.
				message.params = {
					tmpDirPath: this._tmpDirPath,
					xmlEventsFilePath: this._xmlEventsFilePath,
				};

				const typedMessage = classTransformer.plainToInstance(AppendEventMessage, message);
				const cmd = new AppendEventsCommand(typedMessage);
                return cmd.execute(this);
			}
			case "CorrelateEventsCommand": {
                const cmd = new CorrelateEventsCommand(message);
				// TODO: подумать над улучшением представления команд.
				message.params = {
					tmpDirPath: this._tmpDirPath,
					xmlEventsFilePath: this._xmlEventsFilePath,
				};

                return cmd.execute(this);
			}
			default: {
				Log.error(`Команды ${message.cmdName} не найдена в контроллере ${RetroCorrelationViewController.name}`);
			}
        }
    }

	private _xmlEventsFilePath: string;
	private _tmpDirPath: string;

	public static XML_EVENTS_FILENAME = "events.xml";
}