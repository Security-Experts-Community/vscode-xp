import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as fse from 'fs-extra';

import { MustacheFormatter } from '../mustacheFormatter';
import { ExtensionHelper } from '../../helpers/extensionHelper';
import { ContentTreeProvider } from '../contentTree/contentTreeProvider';
import { RuleBaseItem } from '../../models/content/ruleBaseItem';
import { Configuration } from '../../models/configuration';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { ContentHelper } from '../../helpers/contentHelper';

export class CreateRuleViewProvider {

    public static viewId = 'CreateCorrelationView';

    public static showCreateCorrelationViewCommand = 'KnowledgebaseTree.showCreateCorrelationView';
    public static showCreateEnrichmentViewCommand = 'KnowledgebaseTree.showCreateEnrichmentView';

    private constructor(
        private readonly _config: Configuration,
        private readonly _formatter: MustacheFormatter
    ) {}

    public static async init(config : Configuration) : Promise<void> {

        // Форма создания корреляции.
        const createCorrelationTemplateFilePath = path.join(
            ExtensionHelper.getExtentionPath(), "client", "templates", "CreateRule.html");
        const reateCorrelationTemplateContent = await FileSystemHelper.readContentFile(createCorrelationTemplateFilePath);

        const createCorrelationViewProvider = new CreateRuleViewProvider(
            config,
            new MustacheFormatter(reateCorrelationTemplateContent));

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
    }

    public showCreateCorrelationView(ruleFullPath: string): void {
        const templateNames = ContentHelper.getTemplateNames(this._config, ContentHelper.CORRELATIONS_DIRECTORY_NAME);

        this.showCreateRuleView(
            "Создать корреляцию",
            "createCorrelation", 
            "корреляции", 
            ruleFullPath,
            templateNames);
    }

    public showCreateEnrichmentView(ruleFullPath: string) : void {
        const templateNames = ContentHelper.getTemplateNames(this._config, ContentHelper.ENRICHMENTS_DIRECTORY_NAME);

        this.showCreateRuleView(
            "Создать обогащение",
            "createEnrichment", 
            "обогащения", 
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
        ruleTypeLocalization: string,
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

        const resoucesUri = this._config.getExtentionUri();
		const extensionBaseUri = this._view.webview.asWebviewUri(resoucesUri);
        try {
            const templateDefaultContent = {
                "ruleFullPath" : ruleFullPath,
                "commandName" : commandName,
                "ruleTypeLocalization" : ruleTypeLocalization,
                "extensionBaseUri" : extensionBaseUri,
                "templateNames" : templateNames
            };

            const htmlContent = this._formatter.format(templateDefaultContent);
            this._view.webview.html = htmlContent;
        }
        catch (error) {
            ExtensionHelper.showError("Ошибка отображения шаблона корреляции.", error);
        }
    }

    async receiveMessageFromWebView(message: any) {

        // Парсим и проверяем полученные параметры.
        const [ruleName, templateName, ruleParentPath] = this.parseMessageFromFrontEnd(message);

        if(!ruleName) {
            ExtensionHelper.showUserError("Не задано имя корреляции.");
            return;
        }

        if(!templateName) {
            ExtensionHelper.showUserError("Не задана информаця о типе шаблона. Выберите доступный шаблон и повторите попытку.");
            return;
        }

        if(!fs.existsSync(ruleParentPath)) {
            ExtensionHelper.showUserError("Путь для создания корреляции не найден. Возможно повреждение репозитория.");
            return;
        }

        // Проверка пути родительской директории и директории корреляции.
        const ruleFullPath = RuleBaseItem.getRuleDirectoryPath(ruleParentPath, ruleName);
        if(fs.existsSync(ruleFullPath)) {
            const overwriteResult = await vscode.window.showInformationMessage(
                `Хотите перезаписать существующее правило '${ruleName}'?`,
                ...["Да", "Нет"]);

            if (overwriteResult === "Нет") {
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
                    const ruleFromTemplate = await ContentHelper.createCorrelationFromTemplate(ruleName, templateName, this._config);
                    await ruleFromTemplate.save(ruleParentPath);
                    break;
                }
                case 'createEnrichment': {
                    const ruleFromTemplate = await ContentHelper.createEnrichmentFromTemplate(ruleName, templateName, this._config);
                    await ruleFromTemplate.save(ruleParentPath);
                    break;
                }
            }
        }
        catch (error) {
            ExtensionHelper.showError(`Ошибка создания и сохранения корреляции '${ruleName}'.`, error.message);
            return;
        }

        // Обновить дерево и открыть в редакторе созданную корреляцию.
        await vscode.commands.executeCommand(ContentTreeProvider.refreshTreeCommmand);
        await vscode.commands.executeCommand(ContentTreeProvider.onRuleClickCommand, rule);
        
        ExtensionHelper.showUserInfo("Правило успешно создано");
        this._view.dispose();
    }



    private parseMessageFromFrontEnd(message: any) : [string, string, string]  {
        // Проверка имени корреляции.
        let ruleName = message.classifier.Name as string;

        ruleName = ruleName.trim();

        if(ruleName.includes(" ")) {
            ExtensionHelper.showUserError("В имени корреляции нельзя использовать пробельные символы.");
            return;
        }

        // Проверка пути родительской директории и директории корреляции.
        const ruleParentPath = message.classifier.Path;

        // Имя шаблона.
        const templateType = message.classifier.TemplateType;

        return [ruleName, templateType, ruleParentPath];
    }

    private _view: vscode.WebviewPanel;
}