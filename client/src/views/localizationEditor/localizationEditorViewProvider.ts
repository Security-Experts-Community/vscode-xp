import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';

import { ExtensionHelper } from '../../helpers/extensionHelper';
import { MustacheFormatter } from '../mustacheFormatter';
import { Localization, LocalizationExample, LocalizationLanguage } from '../../models/content/localization';
import { RuleBaseItem } from '../../models/content/ruleBaseItem';
import { Correlation } from '../../models/content/correlation';
import { Configuration } from '../../models/configuration';
import { StringHelper } from '../../helpers/stringHelper';
import { XpException } from '../../models/xpException';
import { SiemjManager } from '../../models/siemj/siemjManager';
import { ExceptionHelper } from '../../helpers/exceptionHelper';

export class LocalizationEditorViewProvider  {

	public static readonly viewId = 'LocalizationView';
	
	private _view?: vscode.WebviewPanel;
	private _rule: RuleBaseItem;

	constructor(		
		private readonly _config: Configuration,
		private readonly _templatePath: string
	) { }

	public static init(config: Configuration) {

		const templateFilePath = path.join(
			Configuration.get().getExtensionPath(), "client", "templates", "LocalizationEditor.html");

		const provider = new LocalizationEditorViewProvider(config, templateFilePath);
	
		config.getContext().subscriptions.push(
			vscode.commands.registerCommand(
				LocalizationEditorViewProvider.showLocalizationEditorCommand, 
				async (correlation: Correlation) => provider.showLocalizationEditor(correlation)
			)
		);	
	}

	public static showLocalizationEditorCommand = "LocalizationView.showLocalizationEditor";
	public showLocalizationEditor(rule: RuleBaseItem)  {

		// Если открыта еще одна локализация, то закрываем её перед открытием новой.
		if(this._view) {
			this._view.dispose();
			this._view = undefined;
		}

		this._rule = rule;

		try {
			const localizations = rule.getLocalizations();

			const plainLocalizations: any[] = [];
			localizations.forEach( loc => {

				const locId = loc.getLocalizationId();
				if(!locId) {
					throw new XpException("Не задан LocalizationId.");
				}

				const criteria = loc.getCriteria();
				if(!criteria) {
					throw new XpException(`Критерий для правила локализации не задан: LocalizationId = '${locId}'.`);
				}

				// Ошибка в том случае, если нет обоих локализаций.
				if(!loc.getRuLocalizationText() && !loc.getEnLocalizationText()) {
					throw new XpException(`Для критерия LocalizationId = '${locId}' не задано ни одного значения.`);	
				}

				let ruLocalizationText = loc.getRuLocalizationText();
				if(!loc.getRuLocalizationText()) {
					ruLocalizationText = "";
				}

				let enLocalizationText = loc.getEnLocalizationText();
				if(!enLocalizationText) {
					enLocalizationText = "";
				} 
				
				plainLocalizations.push({
					"Criteria" : criteria,

					"LocalizationId" : locId,
					"RuLocalization" : ruLocalizationText,
					"EnLocalization" : enLocalizationText,
				});
			});

			// Создать и показать панель.
			this._view = vscode.window.createWebviewPanel(
				LocalizationEditorViewProvider.viewId,
				`Правила локализации '${rule.getName()}'`,
				vscode.ViewColumn.One,
				{retainContextWhenHidden : true});

			this._view.webview.options = {
				enableScripts: true
			};
			
			this._view.webview.onDidReceiveMessage(
				this.receiveMessageFromWebView,
				this
			);

			const config = Configuration.get();
			const resoucesUri = config.getExtensionUri();
			const extensionBaseUri = this._view.webview.asWebviewUri(resoucesUri);
			
			const locExamples = this._rule.getLocalizationExamples();
			const templatePlainObject = {
				"RuleName" : rule.getName(),
				"RuDescription" : rule.getRuDescription(),
				"EnDescription" : rule.getEnDescription(),
				"Localizations" : plainLocalizations,
				"ExtensionBaseUri" : extensionBaseUri,
				"LocalizationExamples" : locExamples
			};

			// Подгружаем шаблон и шаблонизируем данные.
			const template = fs.readFileSync(this._templatePath).toString();
			const formatter = new MustacheFormatter(template);
			const htmlContent = formatter.format(templatePlainObject);

			this._view.webview.html = htmlContent;
		}
		catch(error) {
			ExtensionHelper.showUserError(`Не удалось открыть правила локализации. ${error.message}`);
		}
	}

	async receiveMessageFromWebView(message: any) {
		switch (message.command) {
			case 'buildLocalizations': {
				const locExamples = await this.getLocalizationExamples();
				if(locExamples.length === 0) {
					return ExtensionHelper.showUserInfo(
						"Не найдены тесты, позволяющие сгенерировать примеры локализаций. Например, в них не должны использоваться табличные списки и должно ожидаться одно событие.");
				}

				this._rule.setLocalizationExamples(locExamples);
				this.showLocalizationEditor(this._rule);
				break;
			}

			case 'saveLocalizations': {

				try {
					const localization = message.localization;

					// Получаем описание на руссском
					let ruDescription = localization.RuDescription as string;
					ruDescription = StringHelper.textToOneLineAndTrim(ruDescription);
					this._rule.setRuDescription(ruDescription);

					// Получаем описание на английском
					let enDescription = localization.EnDescription as string;
					enDescription = StringHelper.textToOneLineAndTrim(enDescription);
					this._rule.setEnDescription(enDescription);

					// Получаем нужные данные из вебвью и тримим их.
					const criteria = (localization.Criteria as string []).map(c => c.trim());
					const ruLocalizations = (localization.RuLocalizations as string []).map(c => StringHelper.textToOneLineAndTrim(c));
					const enLocalizations = (localization.EnLocalizations as string []).map(c => StringHelper.textToOneLineAndTrim(c));
					const localizationIds = (localization.LocalizationIds as string []).map(c => c.trim());

					const firstDuplicate = this.findDuplicates(criteria);
					if(firstDuplicate != null) {
						ExtensionHelper.showUserError(`Критерий '${firstDuplicate}' дублируется в нескольких правилах локализации`);
						return;
					}

					// Преобразуем полученные данные в нужный формат.
					const localizations = criteria.map( (cr, index) => {
						const ruLoc = ruLocalizations[index];
						const enLoc = enLocalizations[index];
						const loc = Localization.create(cr, ruLoc, enLoc);

						const locId = localizationIds[index];
						if(locId) {
							loc.setLocalizationId(locId);
						}
						
						return loc;
					});

					// Обновляем локализации и сохраняем их.
					this._rule.setLocalizationTemplates(localizations);
					this._rule.saveLocalizations();

					ExtensionHelper.showUserInfo(`Правила локализации для правила ${this._rule.getName()} сохранены.`);
				}
				catch (error) {
					ExtensionHelper.showError("Не удалось сохранить правила локализации.", error);
				}
			}
		}
	}

	private async getLocalizationExamples() : Promise<LocalizationExample[]> {
		return await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: false,
			title: `Генерация локализаций из тестовых событий`
		}, async (progress) => {
			try {
				const siemjManager = new SiemjManager(this._config);
				const locExamples = await siemjManager.getLocalizationExamples(this._rule);
				return locExamples;
			}
			catch (error) {
				ExceptionHelper.show(error);
			}
		});
	}

	private findDuplicates(arr) : string {
		const sorted_arr = arr.slice().sort(); 
		for (let i = 0; i < sorted_arr.length - 1; i++) {
			if (sorted_arr[i + 1] == sorted_arr[i]) {
				return sorted_arr[i];
			}
		}
		return null;
	}
}