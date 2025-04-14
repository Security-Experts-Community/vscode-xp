import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { MustacheFormatter } from '../mustacheFormatter';
import { DialogHelper } from '../../helpers/dialogHelper';
import { ContentTreeProvider } from '../contentTree/contentTreeProvider';
import { RuleBaseItem } from '../../models/content/ruleBaseItem';
import { Configuration } from '../../models/configuration';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { ContentHelper } from '../../helpers/contentHelper';
import { RegExpHelper } from '../../helpers/regExpHelper';
import { NameValidator } from '../../models/nameValidator';

enum CreateType {
  createCorrelation = 'createCorrelation',
  createEnrichment = 'createEnrichment',
  createNormalization = 'createNormalization',
  createAggregation = 'createAggregation'
}

export class CreateRuleViewProvider {
  public static viewId = 'CreateCorrelationView';

  public static showCreateCorrelationViewCommand = 'xp.contentTree.showCreateCorrelationView';
  public static showCreateEnrichmentViewCommand = 'xp.contentTree.showCreateEnrichmentView';
  public static showCreateNormalizationViewCommand = 'xp.contentTree.showCreateNormalizationView';
  public static showCreateAggregationViewCommand = 'xp.contentTree.showCreateAggregationView';

  private constructor(
    private readonly config: Configuration,
    private readonly formatter: MustacheFormatter
  ) {}

  public static async init(config: Configuration): Promise<void> {
    // Форма создания корреляции.
    const createCorrelationTemplateFilePath = path.join(
      config.getExtensionPath(),
      'client',
      'templates',
      'CreateRule.html'
    );
    const createCorrelationTemplateContent = await FileSystemHelper.readContentFile(
      createCorrelationTemplateFilePath
    );

    const createViewProvider = new CreateRuleViewProvider(
      config,
      new MustacheFormatter(createCorrelationTemplateContent)
    );

    config.getContext().subscriptions.push(
      vscode.commands.registerCommand(
        CreateRuleViewProvider.showCreateCorrelationViewCommand,
        async (selectedItem: RuleBaseItem) => {
          const parentFullPath = selectedItem.getDirectoryPath();
          return createViewProvider.showCreateCorrelationView(parentFullPath);
        }
      )
    );

    config.getContext().subscriptions.push(
      vscode.commands.registerCommand(
        CreateRuleViewProvider.showCreateEnrichmentViewCommand,
        async (selectedItem: RuleBaseItem) => {
          const parentFullPath = selectedItem.getDirectoryPath();
          return createViewProvider.showCreateEnrichmentView(parentFullPath);
        }
      )
    );

    config.getContext().subscriptions.push(
      vscode.commands.registerCommand(
        CreateRuleViewProvider.showCreateNormalizationViewCommand,
        async (selectedItem: RuleBaseItem) => {
          const parentFullPath = selectedItem.getDirectoryPath();
          return createViewProvider.showCreateNormalizationView(parentFullPath);
        }
      )
    );

    config.getContext().subscriptions.push(
      vscode.commands.registerCommand(
        CreateRuleViewProvider.showCreateAggregationViewCommand,
        async (selectedItem: RuleBaseItem) => {
          const parentFullPath = selectedItem.getDirectoryPath();
          return createViewProvider.showCreateAggregationView(parentFullPath);
        }
      )
    );
  }

  public showCreateCorrelationView(ruleFullPath: string): void {
    const templateNames = ContentHelper.getTemplateNames(
      this.config,
      ContentHelper.CORRELATIONS_DIRECTORY_NAME
    );

    this.showCreateRuleView(
      this.config.getMessage('View.CreateRule.CreateCorrelationTitle'),
      CreateType.createCorrelation,
      this.config.getMessage('View.CreateRule.CreateCorrelationHeader'),
      ruleFullPath,
      templateNames
    );
  }

  public showCreateEnrichmentView(ruleFullPath: string): void {
    const templateNames = ContentHelper.getTemplateNames(
      this.config,
      ContentHelper.ENRICHMENTS_DIRECTORY_NAME
    );

    this.showCreateRuleView(
      this.config.getMessage('View.CreateRule.CreateEnrichmentTitle'),
      CreateType.createEnrichment,
      this.config.getMessage('View.CreateRule.CreateEnrichmentHeader'),
      ruleFullPath,
      templateNames
    );
  }

  public showCreateNormalizationView(ruleFullPath: string): void {
    const templateNames = ContentHelper.getTemplateNames(
      this.config,
      ContentHelper.NORMALIZATIONS_DIRECTORY_NAME
    );

    this.showCreateRuleView(
      this.config.getMessage('View.CreateRule.CreateNormalizationTitle'),
      CreateType.createNormalization,
      this.config.getMessage('View.CreateRule.CreateNormalizationHeader'),
      ruleFullPath,
      templateNames
    );
  }

  public showCreateAggregationView(ruleFullPath: string): void {
    const templateNames = ContentHelper.getTemplateNames(
      this.config,
      ContentHelper.AGGREGATIONS_DIRECTORY_NAME
    );

    this.showCreateRuleView(
      this.config.getMessage('View.CreateRule.CreateAggregationTitle'),
      CreateType.createAggregation,
      this.config.getMessage('View.CreateRule.CreateAggregationHeader'),
      ruleFullPath,
      templateNames
    );
  }

  /**
   * Создает вьюшку с нужными настройками под тип правила.
   * @param viewTitle
   * @param commandName
   * @param ruleTypeLocalization название типа правила в родительном падеже
   * @param ruleFullPath
   * @returns
   */
  private showCreateRuleView(
    viewTitle: string,
    commandName: string,
    createNewRule: string,
    ruleFullPath: string,
    templateNames?: string[]
  ) {
    // Создать и показать панель.
    this.view = vscode.window.createWebviewPanel(
      CreateRuleViewProvider.viewId,
      viewTitle,
      vscode.ViewColumn.One,
      { retainContextWhenHidden: true }
    );

    this.view.webview.options = {
      enableScripts: true
    };

    this.view.webview.onDidReceiveMessage(this.receiveMessageFromWebView, this);

    const resourcesUri = this.config.getExtensionUri();
    const extensionBaseUri = this.view.webview.asWebviewUri(resourcesUri);
    try {
      const templateDefaultContent = {
        ruleFullPath: ruleFullPath,
        commandName: commandName,

        CreateNewRule: createNewRule,
        NameLabel: this.config.getMessage('View.CreateRule.NameLabel'),
        Template: this.config.getMessage('View.CreateRule.Template'),
        Create: this.config.getMessage('Create'),

        extensionBaseUri: extensionBaseUri,
        templateNames: templateNames
      };

      const htmlContent = this.formatter.format(templateDefaultContent);
      this.view.webview.html = htmlContent;
    } catch (error) {
      DialogHelper.showError('Не удалось отобразить шаблон правила корреляции', error);
    }
  }

  // Функция добавляет defaultFolder к parentPath, если последний является путем к пакету
  private getPath(parentPath: string, defaultFolder: string): string {
    // Магическая функция получения декартового произведения
    const cartesian = (...args) =>
      args.reduce((root, packs) =>
        root.flatMap((root) => packs.map((pack) => [root, pack].flat()))
      );
    const packages = this.config.getPackages();
    const packageRoots = this.config.getContentRoots();
    // Получаем векторное произведение массивов
    const array = cartesian(packageRoots, packages);
    // Объединяем элементы массивов в пути
    const packagesPaths = array.map((arr) => path.join.apply(null, arr));
    // Если текущий путь есть в списке, значит происходит создание через контекстное меню пакета
    return packagesPaths.includes(parentPath) ? path.join(parentPath, defaultFolder) : parentPath;
  }

  async receiveMessageFromWebView(message: any): Promise<void> {
    // Парсим и проверяем полученные параметры.
    const [ruleName, templateName, ruleParentPath] = this.parseMessageFromFrontEnd(message);

    if (!ruleName) {
      DialogHelper.showError('Не задано название правила корреляции');
      return;
    }

    if (!templateName) {
      DialogHelper.showError(
        'Не задана информация о типе шаблона. Выберите шаблон и повторите действие'
      );
      return;
    }

    if (!fs.existsSync(ruleParentPath)) {
      DialogHelper.showError(
        'Путь для создания правила корреляции не найден. Возможно репозиторий поврежден'
      );
      return;
    }

    // Валидация на допустимые символы.
    const validationResult = NameValidator.validate(ruleName, this.config, ruleParentPath);
    if (validationResult) {
      DialogHelper.showError(validationResult);
      return;
    }

    // Проверка пути родительской директории и директории корреляции.
    const ruleFullPath = RuleBaseItem.getRuleDirectoryPath(ruleParentPath, ruleName);
    if (fs.existsSync(ruleFullPath)) {
      const overwriteResult = await DialogHelper.showInfo(
        `Правило с именем '${ruleName}' уже есть. Перезаписать его?`,
        ...[this.config.getMessage('Yes'), this.config.getMessage('No')]
      );

      if (overwriteResult === this.config.getMessage('No')) {
        return;
      }

      // Удаляем старое правило.
      await fs.promises.unlink(ruleFullPath);
    }

    // Создаем шаблон нужного правила.
    let rule: RuleBaseItem;
    try {
      switch (message.command) {
        case CreateType.createCorrelation: {
          rule = await ContentHelper.createCorrelationFromTemplate(
            ruleName,
            templateName,
            this.config
          );
          const newRuleFullPath = this.getPath(
            ruleParentPath,
            ContentHelper.CORRELATIONS_DIRECTORY_NAME
          );
          await rule.save(newRuleFullPath);
          break;
        }
        case CreateType.createEnrichment: {
          rule = await ContentHelper.createEnrichmentFromTemplate(
            ruleName,
            templateName,
            this.config
          );
          const newRuleFullPath = this.getPath(
            ruleParentPath,
            ContentHelper.ENRICHMENTS_DIRECTORY_NAME
          );
          await rule.save(newRuleFullPath);
          break;
        }
        case CreateType.createNormalization: {
          rule = await ContentHelper.createNormalizationFromTemplate(
            ruleName,
            templateName,
            this.config
          );
          const newRuleFullPath = this.getPath(
            ruleParentPath,
            ContentHelper.NORMALIZATIONS_DIRECTORY_NAME
          );
          await rule.save(newRuleFullPath);
          break;
        }
        case CreateType.createAggregation: {
          rule = await ContentHelper.createAggregationFromTemplate(
            ruleName,
            templateName,
            this.config
          );
          const newRuleFullPath = this.getPath(
            ruleParentPath,
            ContentHelper.AGGREGATIONS_DIRECTORY_NAME
          );
          await rule.save(newRuleFullPath);
          break;
        }
      }
    } catch (error) {
      DialogHelper.showError(`Не удалось создать и сохранить правило '${ruleName}'`, error);
      return;
    }

    // Обновить дерево и открыть в редакторе созданную корреляцию.
    await vscode.commands.executeCommand(ContentTreeProvider.refreshTreeCommand);
    await ContentTreeProvider.selectItem(rule);

    DialogHelper.showInfo(this.config.getMessage('View.CreateRule.Message.RuleCreated', ruleName));
    this.view.dispose();
  }

  private parseMessageFromFrontEnd(message: any): [string, string, string] {
    // Проверка имени корреляции.
    let ruleName = message.rule.Name as string;
    ruleName = ruleName.trim();

    // Проверка пути родительской директории и директории корреляции.
    const ruleParentPath = message.rule.Path;
    const validationResult = NameValidator.validate(ruleName, this.config, ruleParentPath);
    if (validationResult) {
      DialogHelper.showError(validationResult);
      return;
    }

    // Имя шаблона.
    const templateType = message.rule.TemplateType;

    return [ruleName, templateType, ruleParentPath];
  }

  private view: vscode.WebviewPanel;
}
