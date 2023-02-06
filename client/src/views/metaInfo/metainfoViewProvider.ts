import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as yaml from 'yaml';

import { ExtensionHelper } from '../../helpers/extensionHelper';
import { RuleBaseItem } from '../../models/content/ruleBaseItem';
import { Correlation } from '../../models/content/correlation';
import { MustacheFormatter } from '../mustacheFormatter';
import { MetaInfoUpdater } from './metaInfoUpdater';
import { Configuration } from '../../models/configuration';
import { IncorrectFieldFillingException } from '../incorrectFieldFillingException';
import { ExceptionHelper } from '../../helpers/exceptionHelper';

export class MetainfoViewProvider  {

	private _view?: vscode.WebviewPanel;
	private _rule : RuleBaseItem;

	public static readonly viewId = 'MetaInfoView';
	public static showMetaInfoEditorCommand = "MetaInfoView.showMetaInfoEditor";

	constructor(
		private readonly _config: Configuration,
		private readonly _formater: MustacheFormatter
	) { }

	public static init(config: Configuration) : MetainfoViewProvider {
		const metaInfoTemplateFilePath = path.join(
			ExtensionHelper.getExtentionPath(), "client", "templates", "MetaInfo.html");
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

	public showMetaInfoEditor(rule: RuleBaseItem)  {

		// Если открыта еще одна метаинформация, то закрываем её перед открытием новой.
		if(this._view) {
			this._view.dispose();
			this._view = undefined;
		}

		this._rule = rule;

		// Создать и показать панель.
		this._view = vscode.window.createWebviewPanel(
			MetainfoViewProvider.viewId,
			`Метаданные '${rule.getName()}'`,
			vscode.ViewColumn.One,
			{retainContextWhenHidden : true});

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
		catch(error) {
			ExtensionHelper.showError("Ошибка визуализации метаинформации.", error);
		}
	}

	private async updateWebView() : Promise<void> {

		// Данные в таком виде проще шаблонизировать.
		const metaInfo = await this._rule.getMetaInfo().toObject();

		// Подгружаем базовую ссылку для внешних ресурсов.
		const resoucesUri = this._config.getExtentionUri();
		const extensionBaseUri = this._view.webview.asWebviewUri(resoucesUri);
		metaInfo.ExtensionBaseUri = extensionBaseUri;

		const metainfoHtml = this._formater.format(metaInfo);
		this._view.webview.html = metainfoHtml;
	}

	async receiveMessageFromWebView(message: any) {
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
					return ExceptionHelper.show(error, "Ошибка сохранения метаданных.");
				}

				return ExtensionHelper.showUserInfo("Метаданные правила успешно сохранены.");
			}
		}
	}

	private _metaInfoUpdater = new MetaInfoUpdater();
}