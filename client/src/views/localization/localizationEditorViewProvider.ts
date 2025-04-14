import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';

import { DialogHelper } from '../../helpers/dialogHelper';
import { MustacheFormatter } from '../mustacheFormatter';
import { Localization } from '../../models/content/localization';
import { RuleBaseItem } from '../../models/content/ruleBaseItem';
import { Configuration } from '../../models/configuration';
import { StringHelper } from '../../helpers/stringHelper';
import { XpException } from '../../models/xpException';
import { ExceptionHelper } from '../../helpers/exceptionHelper';
import { JsHelper } from '../../helpers/jsHelper';
import { ContentHelper } from '../../helpers/contentHelper';
import { CheckLocalizationCommand } from './checkLocalizationsCommand';
import { CommandHelper } from '../../helpers/commandHelper';
import { TestHelper } from '../../helpers/testHelper';

export class LocalizationEditorViewProvider {
  public static readonly viewId = 'LocalizationView';
  public static provider: LocalizationEditorViewProvider;

  private view?: vscode.WebviewPanel;
  private rule: RuleBaseItem;

  constructor(
    private readonly config: Configuration,
    private readonly templatePath: string
  ) {}

  public static init(config: Configuration): void {
    const templateFilePath = path.join(
      config.getExtensionPath(),
      'client',
      'templates',
      'LocalizationEditor.html'
    );

    LocalizationEditorViewProvider.provider = new LocalizationEditorViewProvider(
      config,
      templateFilePath
    );

    config
      .getContext()
      .subscriptions.push(
        vscode.commands.registerCommand(
          LocalizationEditorViewProvider.showLocalizationEditorCommand,
          async (rule: RuleBaseItem) =>
            LocalizationEditorViewProvider.provider.showLocalizationEditor(rule)
        )
      );
  }

  public static showLocalizationEditorCommand = 'LocalizationView.showLocalizationEditor';
  public async showLocalizationEditor(rule: RuleBaseItem, keepTmpFiles = false): Promise<void> {
    // Если открыта еще одна локализация, то закрываем ее перед открытием новой.
    if (this.view) {
      this.view.dispose();
      this.view = undefined;
    }

    this.rule = rule;

    // Сохраняем директорию для временных файлов, которая будет единая для вьюшки.
    if (!keepTmpFiles) {
      this.tmpFilesPath = this.config.getRandTmpSubDirectoryPath();
      await fs.promises.mkdir(this.tmpFilesPath, { recursive: true });
    }

    try {
      // Создать и показать панель.
      const title = this.config.getMessage('View.Localization.Title', rule.getName());
      this.view = vscode.window.createWebviewPanel(
        LocalizationEditorViewProvider.viewId,
        title,
        vscode.ViewColumn.One,
        {
          retainContextWhenHidden: true,
          enableFindWidget: true
        }
      );

      this.view.onDidDispose(async (e: void) => {
        this.view = undefined;
      }, this);

      this.view.webview.options = {
        enableScripts: true
      };

      this.view.webview.onDidReceiveMessage(this.receiveMessageFromWebView, this);

      this.updateView();
    } catch (error) {
      ExceptionHelper.show(error, `Не удалось отобразить правила локализации`);
    }
  }

  /**
   * Обновляем состояние правила и его визуализацию, если оно изменилось. Нельзя обновить одно правило другим, проверяется совпадение имен правил.
   * @param newRule новое состояние правила
   * @returns было ли обновлено правило
   */
  public async updateRule(newRule: RuleBaseItem): Promise<boolean> {
    if (this.view && this.rule && this.rule.getName() === newRule.getName()) {
      // Сохраняем текущий статус правила
      const prevIcon = this.rule.iconPath;
      newRule.iconPath = prevIcon;

      // Сохраняем примеры локализаций
      const localizationExamples = this.rule.getLocalizationExamples();
      newRule.setLocalizationExamples(localizationExamples);

      this.rule = newRule;
      if (this.view) {
        this.updateView();
      }
      return true;
    }

    return false;
  }

  /**
   * Обновляем визуализацию правила
   */
  public async updateView(): Promise<void> {
    const localizations = this.rule.getLocalizations();

    const plainLocalizations = localizations.map((loc) => {
      const locId = loc.getLocalizationId();
      if (!locId) {
        throw new XpException('Не задан LocalizationId');
      }

      const criteria = loc.getCriteria();
      if (!criteria) {
        throw new XpException(
          `Критерий для правила локализации не задан: LocalizationId = ${locId}`
        );
      }

      // Ошибка в том случае, если нет обоих локализаций.
      if (!loc.getRuLocalizationText() && !loc.getEnLocalizationText()) {
        throw new XpException(
          `Для критерия LocalizationId = ${locId} не задано ни одного значения`
        );
      }

      const ruLocalizationText = loc.getRuLocalizationText() ?? '';
      const enLocalizationText = loc.getEnLocalizationText() ?? '';

      return {
        Criteria: criteria,
        LocalizationId: locId,
        RuLocalization: ruLocalizationText,
        EnLocalization: enLocalizationText
      };
    });

    const resourcesUri = this.config.getExtensionUri();
    const extensionBaseUri = this.view.webview.asWebviewUri(resourcesUri);

    const locExamples = this.rule.getLocalizationExamples();
    const templatePlainObject = {
      RuleName: this.rule.getName(),
      RuDescription: this.rule.getRuDescription(),
      EnDescription: this.rule.getEnDescription(),
      Localizations: plainLocalizations,
      ExtensionBaseUri: extensionBaseUri,
      LocalizationExamples: locExamples,
      IsLocalizableRule: ContentHelper.isLocalizableRule(this.rule),
      IsTestedLocalizationsRule: TestHelper.isTestedLocalizationsRule(this.rule),
      DefaultLocalizationCriteria: await ContentHelper.getDefaultLocalizationCriteria(this.rule),

      Locale: {
        CheckLocalizations: this.config.getMessage('View.Localization.CheckLocalizations'),
        Description: this.config.getMessage('View.Localization.Description'),
        LocalizationCriteria: this.config.getMessage('View.Localization.LocalizationCriteria'),
        Criteria: this.config.getMessage('View.Localization.Criteria'),
        LocalizationExamples: this.config.getMessage('View.Localization.LocalizationExamples'),
        Save: this.config.getMessage('Save')
      }
    };

    // Подгружаем шаблон и шаблонизируем данные.
    const template = (await fs.promises.readFile(this.templatePath)).toString();
    const formatter = new MustacheFormatter(template);
    const htmlContent = formatter.format(templatePlainObject);

    this.view.webview.html = htmlContent;
  }

  async receiveMessageFromWebView(message: any): Promise<void> {
    switch (message.command) {
      case 'buildLocalizations': {
        const command = new CheckLocalizationCommand(this, {
          config: this.config,
          rule: this.rule,
          tmpDirPath: this.tmpFilesPath,
          message: message
        });
        await CommandHelper.singleExecutionCommand(command);
        break;
      }

      case 'saveLocalizations': {
        try {
          const localizations = message.localizations;
          await this.saveLocalization(localizations, true);
        } catch (error) {
          ExceptionHelper.show(error, 'Не удалось сохранить правила локализации');
        }
      }
    }
  }

  public async saveLocalization(localization: any, informUser: boolean): Promise<void> {
    // Получаем описание на русском
    let ruDescription = localization.RuDescription as string;
    ruDescription = ruDescription.trim();
    this.rule.setRuDescription(ruDescription);

    // Получаем описание на английском
    let enDescription = localization.EnDescription as string;
    enDescription = enDescription.trim();
    this.rule.setEnDescription(enDescription);

    // Получаем нужные данные из вебвью и тримим их.
    const criteria = (localization.Criteria as string[]).map((c) => c.trim());
    const ruLocalizations = (localization.RuLocalizations as string[]).map((c) =>
      StringHelper.textToOneLineAndTrim(c)
    );
    const enLocalizations = (localization.EnLocalizations as string[]).map((c) =>
      StringHelper.textToOneLineAndTrim(c)
    );
    const localizationIds = (localization.LocalizationIds as string[]).map((c) => c.trim());

    const firstDuplicate = JsHelper.findDuplicates(criteria);
    if (firstDuplicate != null) {
      DialogHelper.showError(
        `Критерий ${firstDuplicate} дублируется в нескольких правилах локализации`
      );
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
      this.rule.setLocalizationTemplates(localizations);
    }

    await this.rule.saveMetaInfoAndLocalizations();
    if (informUser) {
      DialogHelper.showInfo(`Правила локализации для ${this.rule.getName()} сохранены`);
    }
  }

  private tmpFilesPath: string;
}
