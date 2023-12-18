import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';

import { DialogHelper } from '../../helpers/dialogHelper';
import { MustacheFormatter } from '../mustacheFormatter';
import { Localization, LocalizationExample } from '../../models/content/localization';
import { ContentItemStatus, RuleBaseItem } from '../../models/content/ruleBaseItem';
import { Correlation } from '../../models/content/correlation';
import { Configuration } from '../../models/configuration';
import { StringHelper } from '../../helpers/stringHelper';
import { XpException } from '../../models/xpException';
import { SiemjManager } from '../../models/siemj/siemjManager';
import { ExceptionHelper } from '../../helpers/exceptionHelper';
import { SiemJOutputParser } from '../../models/siemj/siemJOutputParser';
import { IntegrationTestRunner } from '../../models/tests/integrationTestRunner';
import { RunIntegrationTestDialog } from '../runIntegrationDialog';
import { Enrichment } from '../../models/content/enrichment';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { Log } from '../../extension';
import { TestHelper } from '../../helpers/testHelper';
import { ContentTreeProvider } from '../contentTree/contentTreeProvider';
import { OperationCanceledException } from '../../models/operationCanceledException';
import { JsHelper } from '../../helpers/jsHelper';

export class LocalizationEditorViewProvider {

	public static readonly viewId = 'LocalizationView';
	public static provider: LocalizationEditorViewProvider;

	private _view?: vscode.WebviewPanel;
	private _rule: RuleBaseItem;

	constructor(
		private readonly _config: Configuration,
		private readonly _templatePath: string
	) { }

	public static init(config: Configuration) {

		const templateFilePath = path.join(
			config.getExtensionPath(), "client", "templates", "LocalizationEditor.html");

		LocalizationEditorViewProvider.provider = new LocalizationEditorViewProvider(
			config,
			templateFilePath);

		config.getContext().subscriptions.push(
			vscode.commands.registerCommand(
				LocalizationEditorViewProvider.showLocalizationEditorCommand,
				async (correlation: Correlation) => LocalizationEditorViewProvider.provider.showLocalizationEditor(correlation)
			)
		);
	}

	public static showLocalizationEditorCommand = "LocalizationView.showLocalizationEditor";
	public async showLocalizationEditor(rule: RuleBaseItem, keepTmpFiles = false) {

		// Если открыта еще одна локализация, то закрываем её перед открытием новой.
		if (this._view) {
			this._view.dispose();
			this._view = undefined;
		}

		this._rule = rule;

		// Сохраняем директорию для временных файлов, которая будет единая для вьюшки.
		if(!keepTmpFiles) {
			this._integrationTestTmpFilesPath = this._config.getRandTmpSubDirectoryPath();
		}

		try {
			// Создать и показать панель.
			this._view = vscode.window.createWebviewPanel(
				LocalizationEditorViewProvider.viewId,
				`Правила локализации '${rule.getName()}'`,
				vscode.ViewColumn.One,
				{
					retainContextWhenHidden: true, 
					enableFindWidget: true
				});

			this._view.onDidDispose(async (e: void) => {
				this._view = undefined;
			},
			this);

			this._view.webview.options = {
				enableScripts: true
			};

			this._view.webview.onDidReceiveMessage(
				this.receiveMessageFromWebView,
				this
			);

			this.updateView();
		}
		catch (error) {
			ExceptionHelper.show(error, `Не удалось открыть правила локализации`);
		}
	}

	/**
	 * Обновляем состояние правила и его визуализацию, если оно изменилось. Нельзя обновить одно правило другим, проверяется совпадение имён правил.
	 * @param newRule новое состояние правила
	 * @returns было ли обновлено правило
	 */
	public async updateRule(newRule: RuleBaseItem): Promise<boolean> {
		if(this._view && this._rule && this._rule.getName() === newRule.getName()) {
			// Сохраняем текущий статус правила
			const prevIcon = this._rule.iconPath;
			newRule.iconPath = prevIcon;

			// Сохраняем примеры локализаций
			const localizationExamples = this._rule.getLocalizationExamples();
			newRule.setLocalizationExamples(localizationExamples);

			this._rule = newRule;
			if(this._view) {
				this.updateView();
			}
			return true;
		}

		return false;
	}

	/**
	 * Обновляем визуализацию правила
	 */
	public async updateView() {
		const localizations = this._rule.getLocalizations();

		const plainLocalizations: any[] = [];
		localizations.forEach(loc => {

			const locId = loc.getLocalizationId();
			if (!locId) {
				throw new XpException("Не задан LocalizationId");
			}

			const criteria = loc.getCriteria();
			if (!criteria) {
				throw new XpException(`Критерий для правила локализации не задан: LocalizationId = '${locId}'.`);
			}

			// Ошибка в том случае, если нет обоих локализаций.
			if (!loc.getRuLocalizationText() && !loc.getEnLocalizationText()) {
				throw new XpException(`Для критерия LocalizationId = '${locId}' не задано ни одного значения.`);
			}

			let ruLocalizationText = loc.getRuLocalizationText();
			if (!loc.getRuLocalizationText()) {
				ruLocalizationText = "";
			}

			let enLocalizationText = loc.getEnLocalizationText();
			if (!enLocalizationText) {
				enLocalizationText = "";
			}

			plainLocalizations.push({
				"Criteria": criteria,

				"LocalizationId": locId,
				"RuLocalization": ruLocalizationText,
				"EnLocalization": enLocalizationText,
			});
		});

		const resourcesUri = this._config.getExtensionUri();
		const extensionBaseUri = this._view.webview.asWebviewUri(resourcesUri);

		const locExamples = this._rule.getLocalizationExamples();
		const templatePlainObject = {
			"RuleName": this._rule.getName(),
			"RuDescription": this._rule.getRuDescription(),
			"EnDescription": this._rule.getEnDescription(),
			"Localizations": plainLocalizations,
			"ExtensionBaseUri": extensionBaseUri,
			"LocalizationExamples": locExamples,
			"IsLocalizableRule": this.isLocalizableRule(this._rule),
			"IsTestedLocalizationsRule" : this.isTestedLocalizationsRule(this._rule)
		};

		// Подгружаем шаблон и шаблонизируем данные.
		const template = (await fs.promises.readFile(this._templatePath)).toString();
		const formatter = new MustacheFormatter(template);
		const htmlContent = formatter.format(templatePlainObject);

		this._view.webview.html = htmlContent;
	}

	private isLocalizableRule(rule: RuleBaseItem): boolean {
		if (rule instanceof Enrichment) {
			return false;
		}

		return true;
	}

	private isTestedLocalizationsRule(rule: RuleBaseItem): boolean {
		return rule instanceof Correlation;
	}

	async receiveMessageFromWebView(message: any) {
		switch (message.command) {
			case 'buildLocalizations': {

				try {
					if( !(this._rule instanceof Correlation) ) {
						return DialogHelper.showInfo(
							"В настоящий момент поддерживается проверка локализаций только для корреляций. Если вам требуется поддержка других правил, можете добавить или проверить наличие подобного [Issue](https://github.com/Security-Experts-Community/vscode-xp/issues).");					
					}

					// Сбрасываем статус правила в исходный
					this._rule.setStatus(ContentItemStatus.Default);
					await ContentTreeProvider.refresh(this._rule);
	
					const localizations = message.localizations;
					await this.saveLocalization(localizations);
					
					const locExamples = await this.getLocalizationExamples();

					if (locExamples.length === 0) {
						return DialogHelper.showInfo(
							"По имеющимся событиям не отработала ни одна локализация. Проверьте, что интеграционные тесты проходят, корректны критерии локализации. После исправлений повторите.");
					}

					const verifiedLocalization = locExamples.some(le => TestHelper.isDefaultLocalization(le.ruText));
					if(verifiedLocalization) {
						DialogHelper.showError("Обнаружена локализация по умолчанию. Исправьте/добавьте нужные критерии локализаций и повторите");
						this._rule.setStatus(ContentItemStatus.Unverified, "Локализации не прошли проверку");
					} else {
						this._rule.setStatus(ContentItemStatus.Verified, "Интеграционные тесты и локализации прошли проверку");
					}

					await ContentTreeProvider.refresh(this._rule);
	
					this._rule.setLocalizationExamples(locExamples);
					this.showLocalizationEditor(this._rule, true);
				}
				catch(error) {
					ExceptionHelper.show(error, "Неожиданная ошибка тестирования локализаций");

					// Если произошла отмена операции, мы не очищаем временные файлы.
					if(error instanceof OperationCanceledException) {
						return;	
					}
					
					try {
						await FileSystemHelper.deleteAllSubDirectoriesAndFiles(this._integrationTestTmpFilesPath);
					}
					catch(error) {
						Log.warn("Ошибка очистки временных файлов интеграционных тестов", error);
					}
				}
				break;
			}

			case 'saveLocalizations': {

				try {
					const localizations = message.localizations;
					await this.saveLocalization(localizations);

					DialogHelper.showInfo(`Правила локализации для ${this._rule.getName()} сохранены`);
				}
				catch (error) {
					ExceptionHelper.show(error, "Не удалось сохранить правила локализации");
				}
			}
		}
	}

	private async saveLocalization(localization : any) {
		// Получаем описание на русском
		let ruDescription = localization.RuDescription as string;
		ruDescription = StringHelper.textToOneLineAndTrim(ruDescription);
		this._rule.setRuDescription(ruDescription);

		// Получаем описание на английском
		let enDescription = localization.EnDescription as string;
		enDescription = StringHelper.textToOneLineAndTrim(enDescription);
		this._rule.setEnDescription(enDescription);

		// Получаем нужные данные из вебвью и тримим их.
		const criteria = (localization.Criteria as string[]).map(c => c.trim());
		const ruLocalizations = (localization.RuLocalizations as string[]).map(c => StringHelper.textToOneLineAndTrim(c));
		const enLocalizations = (localization.EnLocalizations as string[]).map(c => StringHelper.textToOneLineAndTrim(c));
		const localizationIds = (localization.LocalizationIds as string[]).map(c => c.trim());

		const firstDuplicate = JsHelper.findDuplicates(criteria);
		if (firstDuplicate != null) {
			DialogHelper.showError(`Критерий '${firstDuplicate}' дублируется в нескольких правилах локализации`);
			return;
		}

		// Преобразуем полученные данные в нужный формат.
		const localizations = criteria.map((cr, index) => {
			const ruLoc = ruLocalizations[index];
			const enLoc = enLocalizations[index];
			const loc = Localization.create(cr, ruLoc, enLoc);

			const locId = localizationIds[index];
			if (locId) {
				loc.setLocalizationId(locId);
			}

			return loc;
		});

		// Обновляем локализации и сохраняем их.
		if (localizations.length !== 0) {
			this._rule.setLocalizationTemplates(localizations);
		}

		await this._rule.saveMetaInfoAndLocalizations();
	}

	private async getLocalizationExamples(): Promise<LocalizationExample[]> {
		return await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: true,
		}, async (progress, token) => {
				
			let result: string;
			
			if(fs.existsSync(this._integrationTestTmpFilesPath)) {
				const subDirItems = await fs.promises.readdir(this._integrationTestTmpFilesPath, { withFileTypes: true });

				if(subDirItems.length > 0) {
					result = await DialogHelper.showInfo(
						"Обнаружены результаты предыдущего запуска интеграционных тестов. Если вы модифицировали только правила локализации, то можно использовать предыдущие результаты. В противном случае необходимо запустить интеграционные тесты еще раз.", 
						LocalizationEditorViewProvider.USE_OLD_TESTS_RESULT,
						LocalizationEditorViewProvider.RESTART_TESTS);
	
					// Если пользователь закрыл диалог, завершаем работу.
					if(!result) {
						throw new OperationCanceledException();
					}
				}
			}

			if(!result || result === LocalizationEditorViewProvider.RESTART_TESTS) {
				progress.report({ message: `Получение зависимостей правила для корректной сборки графа корреляций` });
				const ritd = new RunIntegrationTestDialog(this._config, this._integrationTestTmpFilesPath);
				const options = await ritd.getIntegrationTestRunOptions(this._rule);
				options.cancellationToken = token;

				progress.report({ message: `Получение корреляционных событий на основе интеграционных тестов правила` });
				const outputParser = new SiemJOutputParser();
				const testRunner = new IntegrationTestRunner(this._config, outputParser);
				const siemjResult = await testRunner.run(this._rule, options);

				if (!siemjResult.testsStatus) {
					throw new XpException("Не все интеграционные тесты прошли. Для получения тестовых локализации необходимо чтобы успешно проходили все интеграционные тесты.");
				}
			}

			progress.report({ message: `Генерация локализаций на основе корреляционных событий из интеграционных тестов`});
			const siemjManager = new SiemjManager(this._config);
			const locExamples = await siemjManager.buildLocalizationExamples(this._rule, this._integrationTestTmpFilesPath);

			return locExamples;
		});
	}

	private findDuplicates(arr: string[]): string {
		const sorted_arr = arr.slice().sort();
		for (let i = 0; i < sorted_arr.length - 1; i++) {
			if (sorted_arr[i + 1] == sorted_arr[i]) {
				return sorted_arr[i];
			}
		}
		return null;
	}

	private _integrationTestTmpFilesPath: string;

	public static readonly USE_OLD_TESTS_RESULT = "Использовать";
	public static readonly RESTART_TESTS = "Повторить";
}