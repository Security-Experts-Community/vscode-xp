import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import { Configuration } from '../models/configuration';
import { Correlation } from '../models/content/correlation';

import { Enrichment } from '../models/content/enrichment';
import { XpException } from '../models/xpException';
import { FileSystemHelper } from './fileSystemHelper';
import { KbHelper } from './kbHelper';

export class ContentHelper {

    public static replaceAllRuleNamesWithinString(oldRuleName : string, newRuleName : string, ruleCode : string): string {
        ruleCode = ruleCode.replace(new RegExp(oldRuleName, "gm"), `${newRuleName}`);
        return ruleCode;
    }

    public static getTemplateNames(config : Configuration, contentDirectory : string) : string[] {
        const templatesPath = path.join(
            config.getExtensionPath(), "content_templates", contentDirectory);

        const templateNames = 
            FileSystemHelper.getRecursiveDirPathSync(templatesPath)
            .map(p => path.basename(p));

        return templateNames;
    }

    public static async createCorrelationFromTemplate(
        ruleName : string,
        templateName : string,
        config: Configuration) : Promise<Correlation> {

        const templatesPath = path.join(config.getExtensionPath(), this.CONTENT_TEMPLATES_DIRECTORY_NAME, this.CORRELATIONS_DIRECTORY_NAME);
        const tmpDirPath = config.getRandTmpSubDirectoryPath();
        await this.copyContentTemplateToTmpDirectory(templateName, templatesPath, tmpDirPath);

        // Копируем во временную директорию и переименовываем.
        const templateCorrTmpDirPath = path.join(tmpDirPath, templateName);
        const ruleFromTemplate = await Correlation.parseFromDirectory(templateCorrTmpDirPath);
        await ruleFromTemplate.rename(ruleName);

        // Задаем ObjectID только при создании корреляции.
        const contentPrefix = Configuration.get().getContentPrefix();
		const objectId = KbHelper.generateRuleObjectId(ruleName, contentPrefix);
		ruleFromTemplate.getMetaInfo().setObjectId(objectId);

        return ruleFromTemplate;
    }

    public static async createEnrichmentFromTemplate(
        ruleName : string,
        templateName : string,
        config: Configuration) : Promise<Correlation> {

        const templatesPath = path.join(config.getExtensionPath(), this.CONTENT_TEMPLATES_DIRECTORY_NAME, this.ENRICHMENTS_DIRECTORY_NAME);
        const tmpDirPath = config.getRandTmpSubDirectoryPath();
        await this.copyContentTemplateToTmpDirectory(templateName, templatesPath, tmpDirPath);

        // Копируем во временную директорию и переименовываем.
        const templateTmpDirPath = path.join(tmpDirPath, templateName);
        const ruleFromTemplate = await Enrichment.parseFromDirectory(templateTmpDirPath);
        await ruleFromTemplate.rename(ruleName);

        // Задаем ObjectID только при создании обогащения.
        const contentPrefix = Configuration.get().getContentPrefix();
        const objectId = KbHelper.generateRuleObjectId(ruleName, contentPrefix);
        ruleFromTemplate.getMetaInfo().setObjectId(objectId);
        return ruleFromTemplate;
    }

    public static async copyContentTemplateToTmpDirectory(templateName : string, templatesPath : string, tmpDirPath: string) {
        // Находим путь к нужному шаблону.
        const templateDirPath = 
            FileSystemHelper.getRecursiveDirPathSync(templatesPath)
            .find(p => path.basename(p).toLocaleLowerCase() === templateName.toLocaleLowerCase());

        if(!templateDirPath) {
            throw new XpException("Заданное имя шаблона не найдено.");
        }
        
        // Копируем во временную директорию и переименовываем.
        const templateCorrTmpDirPath = path.join(tmpDirPath, templateName);

        await fs.promises.mkdir(templateCorrTmpDirPath, {recursive: true});
        await fse.copy(templateDirPath, templateCorrTmpDirPath, {recursive: true}); 
    }

    public static replaceAllCorrelantionNameWithinCode(newRuleName : string, ruleCode : string): string {
        const parseRuleNameReg = /rule\s+(\S+?)\s*:/gm;
        const ruleNameParseResult = parseRuleNameReg.exec(ruleCode);

        // Если правило пустое, тогда нечего переименовывать.
        if(!ruleNameParseResult) {
            return ruleCode;
        }

        if(ruleNameParseResult.length != 2) {
            throw new Error("Ошибка разбора файла правила корреляции");
        }

        const ruleName = ruleNameParseResult[1];
        // Заменяем во всяких вайтлистингах.
        ruleCode = ruleCode.replace(new RegExp(`"${ruleName}"`, "gm"), `"${newRuleName}"`);
        ruleCode = ruleCode.replace(parseRuleNameReg, `rule ${newRuleName}:`);
        return ruleCode;
    }

    public static replaceAllEnrichmentNameWithinCode(newRuleName : string, ruleCode : string): string {
        const parseRuleNameReg = /enrichment\s+(\S+)/gm;
        const ruleNameParseResult = parseRuleNameReg.exec(ruleCode);
        
        // Если правило пустое, тогда нечего переименовывать.
        if(!ruleNameParseResult) {
            return ruleCode;
        }

        if(ruleNameParseResult.length != 2) {
            throw new Error("Ошибка разбора файла правила обогащения");
        }

        const ruleName = ruleNameParseResult[1];
        // Заменяем во всяких вайтлистингах.
        ruleCode = ruleCode.replace(new RegExp(`"${ruleName}"`, "gm"), `"${newRuleName}"`);
        ruleCode = ruleCode.replace(parseRuleNameReg, `enrichment ${newRuleName}`);
        return ruleCode;
    }

    public static CORRELATIONS_DIRECTORY_NAME  = "correlation_rules";
    public static ENRICHMENTS_DIRECTORY_NAME  = "enrichment_rules";
    public static CONTENT_TEMPLATES_DIRECTORY_NAME  = "content_templates";
}

