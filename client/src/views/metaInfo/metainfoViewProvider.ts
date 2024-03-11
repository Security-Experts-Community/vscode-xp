import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { DialogHelper } from '../../helpers/dialogHelper';
import { RuleBaseItem } from '../../models/content/ruleBaseItem';
import { Correlation } from '../../models/content/correlation';
import { MustacheFormatter } from '../mustacheFormatter';
import { MetaInfoUpdater } from './metaInfoUpdater';
import { Configuration } from '../../models/configuration';
import { ExceptionHelper } from '../../helpers/exceptionHelper';

export class MetainfoViewProvider {

	private _view?: vscode.WebviewPanel;
	private _rule: RuleBaseItem;

	public static readonly viewId = 'MetaInfoView';
	public static showMetaInfoEditorCommand = "MetaInfoView.showMetaInfoEditor";

	constructor(
		private readonly _config: Configuration,
		private readonly _formatter: MustacheFormatter
	) { }

	public static init(config: Configuration): MetainfoViewProvider {
		const metaInfoTemplateFilePath = path.join(
			config.getExtensionPath(), "client", "templates", "MetaInfo.html");
		const metainfoTemplateContent = fs.readFileSync(metaInfoTemplateFilePath).toString();

		const metaInfoViewProvider = new MetainfoViewProvider(
			config,
			new MustacheFormatter(metainfoTemplateContent),
		);

		config.getContext().subscriptions.push(
			vscode.commands.registerCommand(
				MetainfoViewProvider.showMetaInfoEditorCommand,
				async (correlation: Correlation) => {
					metaInfoViewProvider.showMetaInfoEditor(correlation);
				}
			)
		);

		return metaInfoViewProvider;
	}

	public async showMetaInfoEditor(rule: RuleBaseItem) : Promise<void> {

		// Если открыта еще одна метаинформация, то закрываем её перед открытием новой.
		if (this._view) {
			this._view.dispose();
			this._view = undefined;
		}

		this._rule = rule;

		// Создать и показать панель.
		const title = this._config.getMessage("View.Metainfo", rule.getName());
		this._view = vscode.window.createWebviewPanel(
			MetainfoViewProvider.viewId,
			title,
			vscode.ViewColumn.One,
			{ retainContextWhenHidden: true });

		this._view.webview.options = {
			enableScripts: true
		};

		this._view.webview.onDidReceiveMessage(
			this.receiveMessageFromWebView,
			this
		);

		try {
			this.updateWebView();
		}
		catch (error) {
			DialogHelper.showError("Ошибка визуализации метаданных", error);
		}
	}

	private async updateWebView(): Promise<void> {

		// Данные в таком виде проще шаблонизировать.
		const metaInfo = await this._rule.getMetaInfo().toObject();

		// Подгружаем базовую ссылку для внешних ресурсов.
		const resourcesUri = this._config.getExtensionUri();
		const extensionBaseUri = this._view.webview.asWebviewUri(resourcesUri);
		metaInfo.ExtensionBaseUri = extensionBaseUri;

		const webviewUri = this.getUri(this._view.webview, this._config.getExtensionUri(), ["client", "out", "ui.js"]);
		const metainfoHtml = this._formatter.format({ ...metaInfo,
			WebviewUri: webviewUri,

			// Локализация
			Localization: {
				Save: this._config.getMessage("Save"),
				KnowledgeHolders : this._config.getMessage("View.Metainfo.KnowledgeHolders"),
				Created: this._config.getMessage("View.Metainfo.Created"),
				Updated: this._config.getMessage("View.Metainfo.Updated"),
				Usecases: this._config.getMessage("View.Metainfo.Usecases"),
				Falsepositives: this._config.getMessage("View.Metainfo.Falsepositives"),
				Improvements: this._config.getMessage("View.Metainfo.Improvements"),
				References: this._config.getMessage("View.Metainfo.References"),
				DataSources: this._config.getMessage("View.Metainfo.DataSources"),
			}
		});
		this._view.webview.html = metainfoHtml;
	}

	private async receiveMessageFromWebView(message: any) {
		switch (message.command) {
			case 'saveMetaInfo': {
				try {
					// Обновление метаданных.
					const newMetaInfoPlain = message.metainfo;
					const metaInfo = this._rule.getMetaInfo();
					this._metaInfoUpdater.update(metaInfo, newMetaInfoPlain);

					// Сохранением и перечитываем из файла.
					const corrFullPath = this._rule.getDirectoryPath();
					await metaInfo.save(corrFullPath);

					await this.updateWebView();
				}
				catch (error) {
					return ExceptionHelper.show(error, "Не удалось сохранить метаданные");
				}

				return DialogHelper.showInfo("Метаданные правила сохранены");
			}
		}
	}

	private _metaInfoUpdater = new MetaInfoUpdater();

	private getUri(webview: vscode.Webview, extensionUri: vscode.Uri, pathList: string[]) {
		return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...pathList));
	}
}