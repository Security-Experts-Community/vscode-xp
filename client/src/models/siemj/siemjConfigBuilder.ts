import * as fs from 'fs';
import * as path from 'path';

import { Configuration } from '../configuration';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { Log } from '../../extension';
import { XpException } from '../xpException';
import { EventMimeType } from '../../helpers/testHelper';
import { SiemJOutputParser } from './siemJOutputParser';
import { GetRawSIEMJVersion, SIEMJVersion } from './siemjManager';

export class LocalizationsBuildingOptions {
  rulesSrcPath?: string;
  force = true;
}

export abstract class AbstractSiemjConfBuilder {
  protected config: Configuration;
  protected contentRootPath: string;
  protected contentRootFolder: string;
  protected outputFolder: string;
  protected siemjConfigSection: string;

  constructor(config: Configuration, contentRootPath: string) {
    this.config = config;
    this.contentRootPath = contentRootPath;

    const baseOutputDirPath = config.getBaseOutputDirectoryPath();
    if (!FileSystemHelper.isValidPath(baseOutputDirPath)) {
      throw new XpException(
        `Путь к выходной директории '${baseOutputDirPath}' содержит недопустимые символы. Для корректной работы необходимо использовать только латинские буквы, цифры и другие корректные для путей символы, исключая пробелы`
      );
    }

    this.contentRootFolder = path.basename(contentRootPath);
    this.outputFolder = this.config.getOutputDirectoryPath(this.contentRootFolder);
  }

  abstract getOutputParser(): SiemJOutputParser;

  public addNormalizationsGraphBuilding(force = true): void {
    if (this.scenarios.includes(SiemjConfBuilder.MAKE_NFGRAPH_SCENARIO)) {
      throw new XpException(
        `Дублирование сценария ${SiemjConfBuilder.MAKE_NFGRAPH_SCENARIO} при генерации конфигурационного файла siemj.conf`
      );
    }

    const xpAppendixPath = this.config.getAppendixFullPath();

    if (!force) {
      const normGraphFilePath = this.config.getNormalizationsGraphFilePath(this.contentRootFolder);
      if (fs.existsSync(normGraphFilePath)) {
        Log.info(
          `Normalization force rebuild disabled and there is a formulas graph file '${normGraphFilePath}'. So this step will be skipped.`
        );
        return;
      }
    }

    const output = path.join('${output_folder}', this.config.getNormalizationsGraphFileName());
    const nfgraphBuildingSection = `
[make-nfgraph]
type=BUILD_RULES
rcc_lang=n
rules_src=${this.contentRootPath}
xp_appendix=${xpAppendixPath}
out=${output}`;

    this.siemjConfigSection += nfgraphBuildingSection;
    this.scenarios.push(SiemjConfBuilder.MAKE_NFGRAPH_SCENARIO);
  }

  public addAggregationGraphBuilding(force = true): void {
    if (this.scenarios.includes(SiemjConfBuilder.MAKE_ARGRAPH_SCENARIO)) {
      throw new XpException(
        `Дублирование сценария ${SiemjConfBuilder.MAKE_ARGRAPH_SCENARIO} при генерации конфигурационного файла siemj.conf`
      );
    }

    if (!force) {
      const arGraphFilePath = this.config.getAggregationsGraphFilePath(this.contentRootFolder);
      if (fs.existsSync(arGraphFilePath)) {
        Log.info(
          `Aggregation force rebuild disabled and there is an aggregation graph file '${arGraphFilePath}'. So this step will be skipped.`
        );
        return;
      }
    }

    const output = path.join('${output_folder}', this.config.getAggregationGraphFileName());

    // [make-argraph]
    // type=BUILD_RULES
    // rcc_lang=a
    // rules_src=C:\knowledgebase\packages
    // out=${output_folder}\aggfilters.json
    const argraphBuildingSection = `
[make-argraph]
type=BUILD_RULES
rcc_lang=a
rules_src=${this.contentRootPath}
out=${output}`;

    this.siemjConfigSection += argraphBuildingSection;
    this.scenarios.push(SiemjConfBuilder.MAKE_ARGRAPH_SCENARIO);
  }

  abstract addTablesSchemaBuilding(force?: boolean): void;

  // will have it's own implementation for different SIEMJ versions
  abstract addTablesDbBuilding(force?: boolean): void;

  /**
   * Добавить сборку графа корреляций
   * @param force принудительно пересобрать граф корреляций
   * @param contentSubdirPath собирать определенную часть контента
   * @returns
   */
  public addCorrelationsGraphBuilding(force = true, contentSubdirPath?: string | string[]): void {
    // Не собираем граф, если он уже есть.
    if (!force) {
      const corrGraphFilePath = this.config.getCorrelationsGraphFilePath(this.contentRootFolder);
      if (fs.existsSync(corrGraphFilePath)) {
        Log.info(
          `Correlations force rebuild disabled and there is a correlation graph file '${corrGraphFilePath}'. So this step will be skipped.`
        );
        return;
      }
    }

    let rulesSrcPath: string;
    if (contentSubdirPath) {
      if (Array.isArray(contentSubdirPath)) {
        rulesSrcPath = contentSubdirPath.join(',');
      } else {
        rulesSrcPath = contentSubdirPath;
      }
    } else {
      rulesSrcPath = this.contentRootPath;
    }

    const rulesFilters = this.config.getRulesDirFilters();
    const table_list_schema = path.join('${output_folder}', this.config.getSchemaFileName());
    const output = path.join('${output_folder}', this.config.getCorrelationsGraphFileName());
    const cfgraphBuildingSection = `
[make-crgraph]
type=BUILD_RULES
rcc_lang=c
rules_src=${rulesSrcPath}
rfilters_src=${rulesFilters}
table_list_schema=${table_list_schema}
out=${output}`;

    this.siemjConfigSection += cfgraphBuildingSection;
    this.scenarios.push('make-crgraph');
  }

  public addEnrichmentsGraphBuilding(force = true): void {
    // Не собираем граф, если он уже есть.
    if (!force) {
      const enrichGraphFilePath = this.config.getEnrichmentsGraphFilePath(this.contentRootFolder);
      if (fs.existsSync(enrichGraphFilePath)) {
        Log.info(
          `Enrichments force rebuild disabled and there is an enrichment graph file '${enrichGraphFilePath}'. So this step will be skipped.`
        );
        return;
      }
    }

    const rulesFilters = this.config.getRulesDirFilters();
    const table_list_schema = path.join('${output_folder}', this.config.getSchemaFileName());
    const output = path.join('${output_folder}', this.config.getEnrichmentsGraphFileName());

    const efgraphBuildingSection = `
[make-ergraph]
type=BUILD_RULES
rcc_lang=e
rules_src=${this.contentRootPath}
rfilters_src=${rulesFilters}
table_list_schema=${table_list_schema}
out=${output}`;

    this.siemjConfigSection += efgraphBuildingSection;
    this.scenarios.push('make-ergraph');
  }

  public addLocalizationsBuilding(options?: LocalizationsBuildingOptions): void {
    if (options && !options.force) {
      const enLangFilePath = this.config.getRuLangFilePath(this.contentRootFolder);
      const ruLangFilePath = this.config.getEnLangFilePath(this.contentRootFolder);
      if (fs.existsSync(enLangFilePath) && fs.existsSync(ruLangFilePath)) {
        Log.info(
          `Localizations force rebuild disabled and there are builded localization files '${enLangFilePath}' and '${ruLangFilePath}'. So this step will be skipped.`
        );
        return;
      }
    }

    let rulesSrcPathResult: string;
    if (!options?.rulesSrcPath) {
      rulesSrcPathResult = this.contentRootPath;
    } else {
      rulesSrcPathResult = options.rulesSrcPath;
    }

    const output = path.join('${output_folder}', this.config.getLocalizationsFolder());
    const localizationBuildingSection = `
[make-loca]
type=BUILD_EVENT_LOCALIZATION
rules_src=${rulesSrcPathResult}
out=${output}`;

    this.siemjConfigSection += localizationBuildingSection;
    this.scenarios.push('make-loca');
  }

  public addEventsNormalization(options: {
    rawEventsFilePath: string;
    mime?: EventMimeType;
  }): void {
    const formulas = path.join('${output_folder}', this.config.getNormalizationsGraphFileName());
    const not_norm_events = path.join(
      '${output_folder}',
      this.config.getNotNormalizedEventsFileName()
    );
    const output = path.join('${output_folder}', this.config.getNormalizedEventsFileName());

    let eventNormalizationSection: string;
    if (options.mime) {
      eventNormalizationSection = `
[run-normalize]
type=NORMALIZE
formulas=${formulas}
in=${options.rawEventsFilePath}
raw_without_envelope=yes
mime=${options.mime}
print_statistics=yes
not_norm_events=${not_norm_events}
out=${output}`;
    } else {
      eventNormalizationSection = `
[run-normalize]
type=NORMALIZE
formulas=${formulas}
in=${options.rawEventsFilePath}
raw_without_envelope=no
print_statistics=yes
not_norm_events=${not_norm_events}
out=${output}`;
    }

    this.siemjConfigSection += eventNormalizationSection;
    this.scenarios.push('run-normalize');
  }

  public addEventsEnrichment(): void {
    const enrules = path.join('${output_folder}', this.config.getEnrichmentsGraphFileName());
    const input = path.join('${output_folder}', this.config.getNormalizedEventsFileName());
    const output = path.join('${output_folder}', this.config.getEnrichedEventsFileName());
    const eventEnrichSection = `
[run-enrich]
type=ENRICH
enrules=${enrules}
in=${input}
out=${output}`;

    this.siemjConfigSection += eventEnrichSection;
    this.scenarios.push('run-enrich');
  }

  // will have it's own implementation for different SIEMJ versions

  /**
   * Добавляет выполнение всех тестов из заданной директории.
   * @param testsRuleFullPath директория из которой запускаются тесты.
   * @param keepTmpFiles флаг сохранения временных файлов
   * @returns путь к директории с временными файлами.
   */
  abstract addTestsRun(testsRuleFullPath: string, tmpFilesPath?: string): void;

  public addCorrelateEnrichedEvents(): void {
    const corrules = path.join('${output_folder}', this.config.getCorrelationsGraphFileName());
    const input = path.join('${output_folder}', this.config.getEnrichedEventsFileName());
    const table_list_database = path.join('${output_folder}', this.config.getFptaDbFileName());
    const output = path.join('${output_folder}', this.config.getCorrelatedEventsFileName());
    const eventEnrichSection = `
[run-correlate]
type=CORRELATE
corrules=${corrules}
in=${input}
table_list_database=${table_list_database}
out=${output}`;

    this.siemjConfigSection += eventEnrichSection;
    this.scenarios.push('run-correlate');
  }

  public addCorrelateNormalizedEvents(): void {
    const corrules = path.join('${output_folder}', this.config.getCorrelationsGraphFileName());
    const input = path.join('${output_folder}', this.config.getNormalizedEventsFileName());
    const table_list_database = path.join('${output_folder}', this.config.getFptaDbFileName());
    const output = path.join('${output_folder}', this.config.getCorrelatedEventsFileName());
    const eventEnrichSection = `
[run-correlate]
type=CORRELATE
corrules=${corrules}
in=${input}
table_list_database=${table_list_database}
out=${output}`;

    this.siemjConfigSection += eventEnrichSection;
    this.scenarios.push('run-correlate');
  }

  public addLocalizationForCorrelatedEvents(correlatedEventsFilePath?: string): void {
    let resultCorrelatedEventsFilePath: string;
    if (!correlatedEventsFilePath) {
      resultCorrelatedEventsFilePath = path.join(
        '${output_folder}',
        this.config.getCorrelatedEventsFileName()
      );
    } else {
      resultCorrelatedEventsFilePath = correlatedEventsFilePath;
    }

    const locaRulesDir = path.join('${output_folder}', this.config.getLangsDirName());
    const ruOutput = path.join('${output_folder}', this.config.getRuRuleLocalizationFileName());
    const enOutput = path.join('${output_folder}', this.config.getEnRuleLocalizationFileName());

    const ruLocalization = `
[run-loca-ru]
type=FRONTEND
lang=ru
locarules=${locaRulesDir}
in=${resultCorrelatedEventsFilePath}
out=${ruOutput}

[run-loca-en]
type=FRONTEND
lang=en
locarules=${locaRulesDir}
in=${resultCorrelatedEventsFilePath}
out=${enOutput}`;

    this.siemjConfigSection += ruLocalization;
    this.scenarios.push('run-loca-ru');
    this.scenarios.push('run-loca-en');
  }

  public build(): string {
    const resultConfig = `${this.siemjConfigSection}
[main]
type=SCENARIO
scenario=${this.scenarios.join(' ')}
`;
    Log.info(`Current SIEMJ version: ${GetRawSIEMJVersion(this.config)}`);
    Log.info(Configuration.SIEMJ_CONFIG_FILENAME);
    Log.info(resultConfig);
    return resultConfig;
  }

  protected scenarios: string[] = [];

  protected static MAKE_NFGRAPH_SCENARIO = 'make-nfgraph';

  protected static MAKE_ARGRAPH_SCENARIO = 'make-argraph';
}

/**
 * Билдер конфига для упрощения его формирования по заданным параметрам для первой версии SIEMJ.
 */
export class SiemjConfBuilder extends AbstractSiemjConfBuilder {
  constructor(config: Configuration, contentRootPath: string) {
    super(config, contentRootPath);

    // Заполнение конфига по умолчанию.
    this.siemjConfigSection = `[DEFAULT]
      ptsiem_sdk=${this.config.getSiemSdkDirectoryPath()}
      build_tools=${this.config.getBuildToolsDirectoryFullPath()}
      taxonomy=${this.config.getTaxonomyFullPath()}
      output_folder=${this.outputFolder}
      temp=${this.config.getOutputDirectoryPath(this.contentRootFolder)}`;
  }

  public getOutputParser(): SiemJOutputParser {
    return new SiemJOutputParser(this.config, SIEMJVersion.First);
  }

  public addTablesSchemaBuilding(force = true): void {
    // Если нет табличных списков, то не собираем схему
    // TODO: данная логика тут лишняя, вынести на уровень выше.
    if (!FileSystemHelper.checkIfFilesIsExisting(this.contentRootPath, /\.tl$/)) {
      Log.info(
        'Компиляция схемы не требуется, так как в дереве контента не найдено ни одного файла с расширением .tl'
      );
      return;
    }

    // Не собираем схему, если она уже есть.
    if (!force) {
      const schemaFilePath = this.config.getSchemaFullPath(this.contentRootFolder);
      if (fs.existsSync(schemaFilePath)) {
        Log.info(
          `Компиляция схемы не требуется, так как файл схемы уже существует: '${schemaFilePath}'`
        );
        return;
      }
    }

    const contract = this.config.getTablesContract();
    const tablesSchemaBuildingSection = `
[make-tables-schema]
type=BUILD_TABLES_SCHEMA
table_list_schema_src=${this.contentRootPath}
contract=${contract}
out=\${output_folder}`;

    this.siemjConfigSection += tablesSchemaBuildingSection;
    this.scenarios.push('make-tables-schema');
  }

  public addTablesDbBuilding(force = true): void {
    // Не собираем схему, если она уже есть.
    if (!force) {
      const fptaDbFilePath = this.config.getFptaDbFilePath(this.contentRootFolder);
      if (fs.existsSync(fptaDbFilePath)) {
        Log.info(
          `Tables DB force rebuild disabled and there is a tables db file '${fptaDbFilePath}'. So this step will be skipped.`
        );
        return;
      }
    }

    const table_list_schema = path.join('${output_folder}', this.config.getSchemaFileName());
    const table_list_defaults = path.join(
      '${output_folder}',
      this.config.getCorrelationDefaultsFileName()
    );
    const output = path.join('${output_folder}', this.config.getFptaDbFileName());
    const tablesDatabaseBuildingSection = `
[make-tables-db]
type=BUILD_TABLES_DATABASE
table_list_filltype=All
table_list_schema=${table_list_schema}
table_list_defaults=${table_list_defaults}
out=${output}`;

    this.siemjConfigSection += tablesDatabaseBuildingSection;
    this.scenarios.push('make-tables-db');
  }

  public addTestsRun(testsRuleFullPath: string, tmpFilesPath?: string): void {
    if (!FileSystemHelper.isValidPath(testsRuleFullPath)) {
      throw new XpException(this.config.getMessage('Error.InvalidPath', testsRuleFullPath));
    }

    const formulas = path.join('${output_folder}', this.config.getNormalizationsGraphFileName());
    const enrules = path.join('${output_folder}', this.config.getEnrichmentsGraphFileName());
    const corrules = path.join('${output_folder}', this.config.getCorrelationsGraphFileName());
    const argrules = path.join('${output_folder}', this.config.getAggregationGraphFileName());

    const table_list_defaults = path.join(
      '${output_folder}',
      this.config.getCorrelationDefaultsFileName()
    );
    const crTimeout = this.config.getСorrelatorTimeoutPerSecond();

    let rulesTestsSection = `
[rules-tests]
type=TEST_RULES
cr_timeout=${crTimeout}
formulas=${formulas}
enrules=${enrules}
corrules=${corrules}
aggrules=${argrules}
table_list_defaults=${table_list_defaults}
rules_src=${testsRuleFullPath}`;

    // Добавляем директорию для получения временных файлов, после тестов.
    if (tmpFilesPath) {
      rulesTestsSection += `
temp=${tmpFilesPath}
keep_temp_files=yes`;
    }

    this.siemjConfigSection += rulesTestsSection;
    this.scenarios.push('rules-tests');
  }
}

export class Siemj2ConfBuilder extends AbstractSiemjConfBuilder {
  constructor(config: Configuration, contentRootPath: string) {
    super(config, contentRootPath);

    // Заполнение конфига по умолчанию.
    this.siemjConfigSection = `[DEFAULT]
      sdk=${this.config.getSiemSdkDirectoryPath()}
      build_tools=${this.config.getBuildToolsDirectoryFullPath()}
      taxonomy=${this.config.getTaxonomyFullPath()}
      output_folder=${this.outputFolder}
      temp=${this.config.getOutputDirectoryPath(this.contentRootFolder)}`;
  }

  public getOutputParser(): SiemJOutputParser {
    return new SiemJOutputParser(this.config, SIEMJVersion.Second);
  }

  public addTablesSchemaBuilding(force = true): void {
    // Если нет табличных списков, то не собираем схему
    // TODO: данная логика тут лишняя, вынести на уровень выше.
    if (!FileSystemHelper.checkIfFilesIsExisting(this.contentRootPath, /\.tl$/)) {
      Log.info(
        'Компиляция схемы не требуется, так как в дереве контента не найдено ни одного файла с расширением .tl'
      );
      return;
    }

    // Не собираем схему, если она уже есть.
    if (!force) {
      const schemaFilePath = this.config.getSchemaFullPath(this.contentRootFolder);
      if (fs.existsSync(schemaFilePath)) {
        Log.info(
          `Компиляция схемы не требуется, так как файл схемы уже существует: '${schemaFilePath}'`
        );
        return;
      }
    }

    const contract = this.config.getTablesContract();
    const tablesSchemaBuildingSection = `
[make-tables-schema]
type=TABLES_SCHEMA
table_list_schema_src=${this.contentRootPath}
contract=${contract}
out=\${output_folder}`;

    this.siemjConfigSection += tablesSchemaBuildingSection;
    this.scenarios.push('make-tables-schema');
  }

  public addTablesDbBuilding(force = true): void {
    // Не собираем схему, если она уже есть.
    if (!force) {
      const fptaDbFilePath = this.config.getFptaDbFilePath(this.contentRootFolder);
      if (fs.existsSync(fptaDbFilePath)) {
        Log.info(
          `Tables DB force rebuild disabled and there is a tables db file '${fptaDbFilePath}'. So this step will be skipped.`
        );
        return;
      }
    }

    const table_list_schema = path.join('${output_folder}', this.config.getSchemaFileName());
    const table_list_defaults = path.join(
      '${output_folder}',
      this.config.getCorrelationDefaultsFileName()
    );
    const output = path.join('${output_folder}', this.config.getFptaDbFileName());
    const tablesDatabaseBuildingSection = `
[make-tables-db-create]
type=TABLES_DB_CREATE
out=${output}

[make-tables-db-layout]
type=TABLES_DB_LAYOUT
table_list_schema=${table_list_schema}
out=${output}

[make-tables-db-fill]
type=TABLES_DB_FILL
table_list_schema=${table_list_schema}
table_list_defaults=${table_list_defaults}
out=${output}
`;

    this.siemjConfigSection += tablesDatabaseBuildingSection;
    this.scenarios.push('make-tables-db-create');
    this.scenarios.push('make-tables-db-layout');
    this.scenarios.push('make-tables-db-fill');
  }

  public addTestsRun(testsRuleFullPath: string, tmpFilesPath?: string): void {
    if (!FileSystemHelper.isValidPath(testsRuleFullPath)) {
      throw new XpException(this.config.getMessage('Error.InvalidPath', testsRuleFullPath));
    }

    const formulas = path.join(this.outputFolder, this.config.getNormalizationsGraphFileName());
    const enrules = path.join(this.outputFolder, this.config.getEnrichmentsGraphFileName());
    const corrules = path.join(this.outputFolder, this.config.getCorrelationsGraphFileName());
    const argrules = path.join(this.outputFolder, this.config.getAggregationGraphFileName());
    const table_list_defaults = path.join(
      this.outputFolder,
      this.config.getCorrelationDefaultsFileName()
    );
    const table_list_schema = path.join(this.outputFolder, this.config.getSchemaFileName());

    const test_pipeline_config_path = path.join(
      '${output_folder}',
      this.config.getTestPipelineConfigName()
    );
    const test_pipeline_config = `{
  "graphs": {
    "normalization": ${JSON.stringify(formulas)},
    "correlation": ${JSON.stringify(corrules)},
    "aggregation": ${JSON.stringify(argrules)},
    "enrichment": ${JSON.stringify(enrules)}
  },
  "fields": {
    "exclude-non-taxonomy-fields": true,
    "exclude": [
      "body"
    ],
    "include": [
      "_dropped"
    ],
    "filter-expect-events": [
      "correlation_name",
      "aggregation_name"
    ]
  },
  "root": ${JSON.stringify(testsRuleFullPath)},
  "rules-filters": ${JSON.stringify(this.config.getRulesDirFilters())},
  "fpta-defaults": ${JSON.stringify(table_list_defaults)},
  "taxonomy": ${JSON.stringify(this.config.getTaxonomyFullPath())},
  "schema": ${JSON.stringify(table_list_schema)},
  "appendix": ${JSON.stringify(this.config.getAppendixFullPath())}
} 
    `;

    // Проверяем, что директория для записи файла существует
    const testConfigPath = path.join(this.outputFolder, this.config.getTestPipelineConfigName());
    if (!fs.existsSync(this.outputFolder)) {
      fs.mkdirSync(this.outputFolder, { recursive: true });
    }
    // Сохраняем конфигурационный файл для siemj.
    fs.writeFileSync(testConfigPath, test_pipeline_config);

    let rulesTestsSection = `
[evt-tests-local]
type=TEST_PIPELINE
test_pipeline_config=${test_pipeline_config_path}
test_pipeline_local = yes`;

    // Добавляем директорию для получения временных файлов, после тестов.
    if (tmpFilesPath) {
      rulesTestsSection += `
temp=${tmpFilesPath}`;
    }

    this.siemjConfigSection += rulesTestsSection;
    this.scenarios.push('evt-tests-local');
  }
}
