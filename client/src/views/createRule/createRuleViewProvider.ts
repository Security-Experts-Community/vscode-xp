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

export class CreateRuleViewProvider {

    public static viewId = 'CreateCorrelationView';

    public static showCreateCorrelationViewCommand = 'KnowledgebaseTree.showCreateCorrelationView';
    public static showCreateEnrichmentViewCommand = 'KnowledgebaseTree.showCreateEnrichmentView';
	public static showCreateNormalizationViewCommand = 'KnowledgebaseTree.showCreateNormalizationView';


    private constructor(
        private readonly _config: Configuration,
        private readonly _formatter: MustacheFormatter
    ) {}

    public static async init(config : Configuration) : Promise<void> {

        // Форма создания корреляции.
        const createCorrelationTemplateFilePath = path.join(
            config.getExtensionPath(), "client", "templates", "CreateRule.html");
        const createCorrelationTemplateContent = await FileSystemHelper.readContentFile(createCorrelationTemplateFilePath);

        const createCorrelationViewProvider = new CreateRuleViewProvider(
            config,
            new MustacheFormatter(createCorrelationTemplateContent));

        config.getContext().subscriptions.push(
            vscode.commands.registerCommand(
                CreateRuleViewProvider.showCreateCorrelationViewCommand,
                async (selectedItem: RuleBaseItem) => {
                    const parentFullPath = selectedItem.getDirectoryPath();
                    return createCorrelationViewProvider.showCreateCorrelationView(parentFullPath);
                }
            )
        );

        config.getContext().subscriptions.push(
            vscode.commands.registerCommand(
                CreateRuleViewProvider.showCreateEnrichmentViewCommand,
                async (selectedItem: RuleBaseItem) => {
                    const parentFullPath = selectedItem.getDirectoryPath();
                    return createCorrelationViewProvider.showCreateEnrichmentView(parentFullPath);
                }
            )
        );

        config.getContext().subscriptions.push(
            vscode.commands.registerCommand(
                CreateRuleViewProvider.showCreateNormalizationViewCommand,
                async (selectedItem: RuleBaseItem) => {
                    const parentFullPath = selectedItem.getDirectoryPath();
                    return createCorrelationViewProvider.showCreateNormalizationView(parentFullPath);
                }
            )
        );
    }

    public showCreateCorrelationView(ruleFullPath: string): void {
        const templateNames = ContentHelper.getTemplateNames(this._config, ContentHelper.CORRELATIONS_DIRECTORY_NAME);

        this.showCreateRuleView(
            this._config.getMessage("View.CreateRule.CreateCorrelationTitle"),
            "createCorrelation", 
            this._config.getMessage("View.CreateRule.CreateCorrelationHeader"),
            ruleFullPath,
            templateNames);
    }

    public showCreateEnrichmentView(ruleFullPath: string) : void {
        const templateNames = ContentHelper.getTemplateNames(this._config, ContentHelper.ENRICHMENTS_DIRECTORY_NAME);

        this.showCreateRuleView(
            this._config.getMessage("View.CreateRule.CreateEnrichmentTitle"),
            "createEnrichment", 
            this._config.getMessage("View.CreateRule.CreateEnrichmentHeader"),
            ruleFullPath,
            templateNames);
    }

    public showCreateNormalizationView(ruleFullPath: string) : void {
        const templateNames = ContentHelper.getTemplateNames(this._config, ContentHelper.NORMALIZATIONS_DIRECTORY_NAME);

        this.showCreateRuleView(
            this._config.getMessage("View.CreateRule.CreateNormalizationTitle"),
            "createNormalization", 
            this._config.getMessage("View.CreateRule.CreateNormalizationHeader"), 
            ruleFullPath,
            templateNames);
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
        templateNames?: string[]) {

        // Создать и показать панель.
        this._view = vscode.window.createWebviewPanel(
            CreateRuleViewProvider.viewId,
            viewTitle,
            vscode.ViewColumn.One,
            {retainContextWhenHidden : true});

        this._view.webview.options = {
            enableScripts: true
        };

        this._view.webview.onDidReceiveMessage(
            this.receiveMessageFromWebView,
            this
        );

        const resourcesUri = this._config.getExtensionUri();
		const extensionBaseUri = this._view.webview.asWebviewUri(resourcesUri);
        try {
            const templateDefaultContent = {
                "ruleFullPath" : ruleFullPath,
                "commandName" : commandName,

                "CreateNewRule" : createNewRule,
                "NameLabel" : this._config.getMessage("View.CreateRule.NameLabel"),
                "Template" : this._config.getMessage("View.CreateRule.Template"),
                "Create" : this._config.getMessage("Create"),

                "extensionBaseUri" : extensionBaseUri,
                "templateNames" : templateNames
            };

            const htmlContent = this._formatter.format(templateDefaultContent);
            this._view.webview.html = htmlContent;
        }
        catch (error) {
            DialogHelper.showError("Не удалось отобразить шаблон правила корреляции", error);
        }
    }

    // Функция добавляет defaultFolder к parentPath, если последний является путём к пакету
    private getPath(parentPath: string, defaultFolder: string) : string {
        // Магическая функция получения декартового произведения
        const cartesian = (...args) => args.reduce((root, packs) => root.flatMap(root => packs.map(pack => [root, pack].flat())));
        const packages = this._config.getPackages();
        const packageRoots = this._config.getContentRoots();
        // Получаем векторное произведение массивов
        const array = cartesian(packageRoots, packages);
        // Объединяем элементы массивов в пути
        const packagesPaths = array.map(arr => path.join.apply(null, arr));
        // Если текущий путь есть в списке, значит происходит создание через контекстное меню пакета
        return packagesPaths.includes(parentPath) ? path.join(parentPath, defaultFolder) : parentPath;
    }

    async receiveMessageFromWebView(message: any) : Promise<void> {

        // Парсим и проверяем полученные параметры.
        const [ruleName, templateName, ruleParentPath] = this.parseMessageFromFrontEnd(message);

        if(!ruleName) {
            DialogHelper.showError("Не задано название правила корреляции");
            return;
        }

        if(!templateName) {
            DialogHelper.showError("Не задана информация о типе шаблона. Выберите шаблон и повторите действие");
            return;
        }

        if(!fs.existsSync(ruleParentPath)) {
            DialogHelper.showError("Путь для создания правила корреляции не найден. Возможно репозиторий поврежден");
            return;
        }

        // Валидация на допустимые символы.
        const validationResult = ContentHelper.validateContentItemName(ruleName);
        if(validationResult) {
            DialogHelper.showError(validationResult);
            return;
        }

        // Проверка пути родительской директории и директории корреляции.
        const ruleFullPath = RuleBaseItem.getRuleDirectoryPath(ruleParentPath, ruleName);
        if(fs.existsSync(ruleFullPath)) {
            const overwriteResult = await DialogHelper.showInfo(
                `Правило с именем '${ruleName}' уже есть. Перезаписать его?`,
                ...[this._config.getMessage('Yes'), this._config.getMessage('No')]);

            if (overwriteResult === this._config.getMessage('No')) {
                return;
            }

            // Удаляем старое правило.
            await fs.promises.unlink(ruleFullPath);
        }

        // Создаем шаблон нужного правила.
        let rule : RuleBaseItem;
        try {
            switch (message.command) {
                case 'createCorrelation': {
                    rule = await ContentHelper.createCorrelationFromTemplate(ruleName, templateName, this._config);
                    const newRuleFullPath = this.getPath(ruleParentPath, ContentHelper.CORRELATIONS_DIRECTORY_NAME);
                    await rule.save(newRuleFullPath);
                    break;
                }
                case 'createEnrichment': {
                    rule = await ContentHelper.createEnrichmentFromTemplate(ruleName, templateName, this._config);
                    const newRuleFullPath = this.getPath(ruleParentPath, ContentHelper.ENRICHMENTS_DIRECTORY_NAME);
                    await rule.save(newRuleFullPath);
                    break;
                }
                case 'createNormalization': {
                    rule = await ContentHelper.createNormalizationFromTemplate(ruleName, templateName, this._config);
                    const newRuleFullPath = this.getPath(ruleParentPath, ContentHelper.NORMALIZATIONS_DIRECTORY_NAME);
                    await rule.save(newRuleFullPath);
                    break;
                }
            }
        }
        catch (error) {
            DialogHelper.showError(`Не удалось создать и сохранить правило '${ruleName}'.`, error);
            return;
        }

        // Обновить дерево и открыть в редакторе созданную корреляцию.
        await vscode.commands.executeCommand(ContentTreeProvider.refreshTreeCommand);
        await ContentTreeProvider.selectItem(rule);
        
        DialogHelper.showInfo(`Правило ${ruleName} создано`);
        this._view.dispose();
    }

    private parseMessageFromFrontEnd(message: any) : [string, string, string]  {
        // Проверка имени корреляции.
        let ruleName = message.rule.Name as string;

        ruleName = ruleName.trim();

        if(ruleName.includes(" ")) {
            DialogHelper.showError("Название правила не должно содержать пробел");
            return;
        }

        // Проверка пути родительской директории и директории корреляции.
        const ruleParentPath = message.rule.Path;

        // Имя шаблона.
        const templateType = message.rule.TemplateType;

        return [ruleName, templateType, ruleParentPath];
    }

    private _view: vscode.WebviewPanel;
}