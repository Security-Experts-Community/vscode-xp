import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';

import { ExtensionHelper } from '../../helpers/extensionHelper';
import { MustacheFormatter } from '../mustacheFormatter';
import { Localization, LocalizationLanguage } from '../../models/content/localization';
import { RuleBaseItem } from '../../models/content/ruleBaseItem';
import { Correlation } from '../../models/content/correlation';
import { Configuration } from '../../models/configuration';
import { StringHelper } from '../../helpers/stringHelper';

export class LocalizationEditorViewProvider  {

	public static readonly viewId = 'LocalizationView';
	
	private _view?: vscode.WebviewPanel;
	private _rule: RuleBaseItem;

	constructor(
		private readonly _templatePath: string
	) { }

	public static init(context: vscode.ExtensionContext) {

		const templateFilePath = path.join(
			ExtensionHelper.getExtentionPath(), "client", "templates", "LocalizationEditor.html");

		const provider = new LocalizationEditorViewProvider(templateFilePath);
	
		context.subscriptions.push(
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
					throw new Error("LocalizationId не задан.");
				}

				const criteria = loc.getCriteria();
				if(!criteria) {
					throw new Error(`Критерий локализации пуст для LocalizationId = '${locId}.`);
				}

				if(!loc.getRuLocalizationText()) {
					throw new Error(`Не задана русская локализация для LocalizationId = '${locId}.`);
				}

				if(!loc.getEnLocalizationText()) {
					throw new Error(`Не задана английская локализация для LocalizationId = '${locId}.`);
				}
				
				plainLocalizations.push({
					"Criteria" : criteria,
					"LocalizationId" : locId,
					"RuLocalization" : loc.getRuLocalizationText(),
					"EnLocalization" : loc.getEnLocalizationText()
				});
			});

			// Создать и показать панель.
			this._view = vscode.window.createWebviewPanel(
				LocalizationEditorViewProvider.viewId,
				`Локализации '${rule.getName()}'`,
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
			const resoucesUri = config.getExtentionUri();
			const extensionBaseUri = this._view.webview.asWebviewUri(resoucesUri);
			
			const templatePlainObject = {
				"RuDescription" : rule.getRuDescription(),
				"EnDescription" : rule.getEnDescription(),
				"Localizations" : plainLocalizations,
				"ExtensionBaseUri" : extensionBaseUri,
			};

			// Подгружаем шаблон и шаблонизируем данные.
			const template = fs.readFileSync(this._templatePath).toString();
			const formatter = new MustacheFormatter(template);
			const htmlContent = formatter.format(templatePlainObject);

			this._view.webview.html = htmlContent;
		}
		catch(error) {
			ExtensionHelper.showUserError(`Ошибка открытия файлов локализации. ${error.message}`);
		}
	}

	async receiveMessageFromWebView(message: any) {
		switch (message.command) {
			case 'buildLocalizations': {
				ExtensionHelper.showUserInfo("Проверка локализаций находится на этапе разработки. Stay tunned!");
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
						ExtensionHelper.showUserError(`Критерий '${firstDuplicate}' дублируется в нескольких локализациях`);
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
					this._rule.updateLocalizations(localizations);
					this._rule.saveLocalizations();

					ExtensionHelper.showUserInfo(`Локализация для правила ${this._rule.getName()} успешно сохранена.`);
				}
				catch (error) {
					ExtensionHelper.showError("Ошибка сохранения локализации.", error.message);
				}
			}
		}
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