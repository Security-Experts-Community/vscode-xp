import * as fs from 'fs';
import * as path from 'path';

import { Configuration } from '../configuration';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { Log } from '../../extension';
import { XpException } from '../xpException';
import { EventMimeType } from '../../helpers/testHelper';

export class LocalizationsBuildingOptions {
  rulesSrcPath?: string;
  force = true;
}

/**
 * Билдер конфига для упрощения его формирования по заданным параметрам.
 */
export class SiemjConfBuilder {
  constructor(
    private config: Configuration,
    private contentRootPath: string
  ) {
    // BUILD_TABLES_DATABASE [Err] :: [412] Failed to execute script 'fpta_filler' due to unhandled exception!
    // BUILD_TABLES_DATABASE [Err] :: Traceback (most recent call last):
    // BUILD_TABLES_DATABASE [Err] ::   File "fpta_filler.py", line 1089, in <module>
    // BUILD_TABLES_DATABASE [Err] ::   File "click\core.py", line 1130, in __call__
    // BUILD_TABLES_DATABASE [Err] ::   File "click\core.py", line 1055, in main
    // BUILD_TABLES_DATABASE [Err] ::   File "click\core.py", line 1657, in invoke
    // BUILD_TABLES_DATABASE [Err] ::   File "click\core.py", line 1404, in invoke
    // BUILD_TABLES_DATABASE [Err] ::   File "click\core.py", line 760, in invoke
    // BUILD_TABLES_DATABASE [Err] ::   File "fpta_filler.py", line 1024, in fill
    // BUILD_TABLES_DATABASE [Err] ::   File "fpta_filler.py", line 800, in single_op
    // BUILD_TABLES_DATABASE [Err] ::   File "amnesia\hl\database.py", line 1314, in __init__
    // BUILD_TABLES_DATABASE [Err] ::   File "contextlib.py", line 112, in __enter__
    // BUILD_TABLES_DATABASE [Err] ::   File "amnesia\hl\database.py", line 1381, in transaction_schema
    // BUILD_TABLES_DATABASE [Err] ::   File "contextlib.py", line 112, in __enter__
    // BUILD_TABLES_DATABASE [Err] ::   File "amnesia\hl\database.py", line 1216, in ll_connection
    // BUILD_TABLES_DATABASE [Err] ::   File "contextlib.py", line 112, in __enter__
    // BUILD_TABLES_DATABASE [Err] ::   File "amnesia\hl\database.py", line 1204, in _ll_alterable_connection
    // BUILD_TABLES_DATABASE [Err] ::   File "amnesia\hl\database.py", line 1197, in _refresh_connection
    // BUILD_TABLES_DATABASE [Err] ::   File "amnesia\ll\database\__init__.py", line 21, in db_open
    // BUILD_TABLES_DATABASE [Err] ::   File "amnesia\ll\database\types.py", line 113, in __init__
    // BUILD_TABLES_DATABASE [Err] ::   File "amnesia\ll\exception\__init__.py", line 134, in check_return_code
    // BUILD_TABLES_DATABASE [Err] :: amnesia.ll.exception.FptaError:  : Системе не удается найти указанный путь.

    // Падает сборка БД табличных списков
    const baseOutputDirPath = config.getBaseOutputDirectoryPath();
    if (!FileSystemHelper.isValidPath(baseOutputDirPath)) {
      throw new XpException(
        `Путь к выходной директории '${baseOutputDirPath}' содержит недопустимые символы. Для корректной работы необходимо использовать только латинские буквы, цифры и другие корректные для путей символы, исключая пробелы`
      );
    }

    this.contentRootFolder = path.basename(this.contentRootPath);
    this.outputFolder = this.config.getOutputDirectoryPath(this.contentRootFolder);

    // Заполнение конфига по умолчанию.
    this.siemjConfigSection = `[DEFAULT]
ptsiem_sdk=${this.config.getSiemSdkDirectoryPath()}
build_tools=${this.config.getBuildToolsDirectoryFullPath()}
taxonomy=${this.config.getTaxonomyFullPath()}
output_folder=${this.outputFolder}
temp=${this.config.getOutputDirectoryPath(this.contentRootFolder)}`;
  }

  /**
   * Добавить сборку графа нормализации
   * @param force пересобирать ли ранее собранный	граф
   */
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

  /**
   * Добавить сборку графа агрегации
   * @param force пересобирать ли ранее собранный	граф
   */
  public addAggregationGraphBuilding(force = true): void {
    if (this.scenarios.includes(SiemjConfBuilder.MAKE_ARGRAPH_SCENARIO)) {
      throw new XpException(
        `Дублирование сценария ${SiemjConfBuilder.MAKE_ARGRAPH_SCENARIO} при генерации конфигурационного файла siemj.conf`
      );
    }

    if (!force) {
      const arGraphFilePath = this.config.getAggregationsGraphFilePath(this.contentRootFolder);
      if (fs.existsSync(arGraphFilePath)) {
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

  // `[make-argraph]
  // type=BUILD_RULES
  // rcc_lang=a
  // rules_src=C:\Work\-=SIEM=-\Content\knowledgebase\packages
  // out=${output_folder}\aggfilters.json`;

  /**
   * Рекурсивная проверка по регулярному выражению наличия файлов в директории
   * @param startPath начальная директория для рекурсивного поиска
   * @param fileNameRegexPattern регулярное выражение для поиска
   * @returns
   */
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
        Log.info('Компиляция схемы не требуется, так как файл схемы уже существует');
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

  /**
   * Добавить сборку графа корреляций
   * @param force принудительно пересобрать граф корреляций
   * @param contentSubdirPath собирать определенную часть контента
   * @returns
   */
  public addCorrelationsGraphBuilding(force = true, contentSubdirPath?: string | string[]): void {
    // Не собираем граф, если он уже есть.
    if (!force) {
      const enrichGraphFilePath = this.config.getEnrichmentsGraphFilePath(this.contentRootFolder);
      if (fs.existsSync(enrichGraphFilePath)) {
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

  /**
   * Добавляет выполнение всех тестов из заданной директории.
   * @param testsRuleFullPath директория из которой запускаются тесты.
   * @param keepTmpFiles флаг сохранения временных файлов
   * @returns путь к директории с временными файлами.
   */
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

  /**
   * Добавить генерацию локализаций по коррелированным событиям.
   */
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
    Log.info(Configuration.SIEMJ_CONFIG_FILENAME);
    Log.info(resultConfig);
    return resultConfig;
  }

  private contentRootFolder: string;
  private outputFolder: string;

  private siemjConfigSection: string;
  private scenarios: string[] = [];

  private static MAKE_NFGRAPH_SCENARIO = 'make-nfgraph';

  private static MAKE_ARGRAPH_SCENARIO = 'make-argraph';
}
