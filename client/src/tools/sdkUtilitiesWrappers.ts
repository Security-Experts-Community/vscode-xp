// import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';

import { Configuration } from '../models/configuration';
import { Normalization } from '../models/content/normalization';
import { NormalizationUnitTest } from '../models/tests/normalizationUnitTest';
// import { RuleFileDiagnostics } from '../views/integrationTests/ruleFileDiagnostics';
import { ProcessHelper } from '../helpers/processHelper';
import { DialogHelper } from '../helpers/dialogHelper';
import { ExceptionHelper } from '../helpers/exceptionHelper';
import { FileSystemHelper } from '../helpers/fileSystemHelper';
import { FileSystemException } from '../models/fileSystemException';
import { Log } from '../extension';
import { XpException } from '../models/xpException';
// import { RuleBaseItem } from '../models/content/ruleBaseItem';
// import { BuildLocsOutputParser, FillFPTAOutputParser } from './outputParsers/fillFptaOutputParser';
// import { RCCOutputParser } from './outputParsers/rccOutputParser';
// import { MktablesOutputParser } from './outputParsers/mktablesOutputParser';
// import { SiemKBTestsOutputParser } from './outputParsers/siemKBTestsOutputParser';
// import { XpException } from '../models/xpException';

/** Класс для запуска утилит SDK
 *
 * @param config - глобальные настройки расширения
 *
 */
export class SDKUtilitiesWrappers {
  constructor(private config: Configuration) {}

  /** Функция запуска утилиты создания графов формул нормализации
   *
   * @param buildDirectory - путь до корня директории сборки
   * @returns true - успех, продолжаем цепочку выполнения
   * 			false - ошибка, прерываем цепочку выполнения
   */
  public async testNormalization(
    unitTest: NormalizationUnitTest,
    { useAppendix = false }: { useAppendix: boolean }
  ): Promise<string> {
    const rule = unitTest.getRule();
    Log.info(`Запуск теста №${unitTest.getNumber()} формулы нормализации '${rule.getName()}'`);

    /** Типовая команда выглядит так:
     *
     * ptsiem-sdk\release-25.0\25.0.10201\normalize.exe
     *   --sdk "ptsiem-sdk\release-25.1\25.1.11776"
     *   --temp "temp"
     *   -t "taxonomy\release-25.0\25.0.214\taxonomy.json"
     *   -s "temp\formula.xp"
     *   -r "temp\raw.txt"
     *   -e
     */

    // Формируем параметры запуска утилиты
    const normalizeExePath = this.config.getNormalizer();
    const sdkPath = this.config.getSiemSdkDirectoryPath();
    const rootPath = rule.getContentRootPath(this.config);
    const rootFolder = path.basename(rootPath);
    const tempPath = this.config.getTmpDirectoryPath(rootFolder);
    const taxonomyPath = this.config.getTaxonomyFullPath();
    const appendixPath = this.config.getAppendixFullPath();

    const formulaPath = rule.getFilePath();

    const rawEventPath = unitTest.getTestInputDataPath();
    process.env.PTSIEM_SDK_ROOT = this.config.getSiemSdkDirectoryPath();

    // Запускаем утилиту с параметрами
    let normalizerParams = [
      '--sdk',
      sdkPath,
      '--temp',
      tempPath,
      '-t',
      taxonomyPath,
      '-s',
      formulaPath,
      '-r',
      rawEventPath
    ];

    // Параметр опциональный. Отключили для совместимости с системными тестами
    if (useAppendix) {
      normalizerParams = normalizerParams.concat(['-x', appendixPath]);
    }

    normalizerParams.push('-e');

    const executeResult = await ProcessHelper.execute(normalizeExePath, normalizerParams, {
      outputChannel: this.config.getOutputChannel()
    });

    if (!executeResult.output) {
      throw new XpException(`Нормализатор вернул пустую строку`);
    }

    Log.debug(`Нормализация тестового события завершена c кодом ${executeResult.exitCode}`);
    if (executeResult.exitCode !== 0) {
      Log.error(`Нормализация тестового события завершена c кодом ${executeResult.exitCode}`);
    }

    return executeResult.output;
  }
}
// 	/** Функция проверки отсутствия ошибок в диагностических сообщениях
// 	 *
// 	 * @param diagnostics - набор диагностических сообщений
// 	 * @returns true - ошибки не найдены
// 	 * 			false - нашлась хотя бы одна ошибка
// 	 */
// 	private not_contains_errors(diagnostics: RuleFileDiagnostics[]){
// 		for (const f of diagnostics){
// 			for (const diag of f.Diagnostics){
// 				if (diag.severity == vscode.DiagnosticSeverity.Error){
// 					return false;
// 				}
// 			}
// 		}
// 		return true;
// 	}

// 	/** Функция запуска утилиты создания грфов формул нормализации
// 	 *
// 	 * @param buildDirectory - путь до корня директории сборки
// 	 * @returns true - успех, продолжаем цепочку выполнения
// 	 * 			false - ошибка, прерываем цепочку выполнения
// 	 */
// 	public async buildNormalizations(buildDirectory: string): Promise<boolean> {
// 		return vscode.window.withProgress({
// 			location: vscode.ProgressLocation.Notification,
// 			cancellable: false,
// 			title: `Сбор графа формул нормализации`
// 		}, async (progress) => {
// 			try {
// 				const outputChannel = this.config.getOutputChannel();
// 				outputChannel.appendLine("----------------------------------------");
// 				outputChannel.appendLine("XP :: Building normalization formulas...");
// 				outputChannel.appendLine("----------------------------------------");

// 				/** Типовая команда выглядит так:
// 				 *
// 				 * SDK\ptsiem-sdk\release-25.0\25.0.10201\cli\rcc.exe
// 				 * 		--lang=n
// 				 * 		--taxonomy=\SDK\taxonomy\release-25.0\25.0.199\taxonomy.json
// 				 * 		--formula-appendix=SDK\contracts\xp_appendix\appendix.xp
// 				 * 		--output=\Output\formulas_graph.json
// 				 * 		rules\windows
// 				 */

// 				// Формируем параметры запуска утилиты
// 				const rccExePath = this.config.getRccCli();
// 				const taxonomy_arg = "--taxonomy=" + this.config.getTaxonomyFullPath();
// 				const root = this.config.getRootByPath(buildDirectory);
// 				const rootFolder = path.basename(root);
// 				const normalization_graph_arg = "--output=" + this.config.getNormalizationGraphFilePath(rootFolder);
// 				const formula_appendix = "--formula-appendix=" + this.config.getAppendixFullPath();
// 				const content = buildDirectory;

// 				// Запускаем утилиту с параметрами
// 				// TODO: Возможно есть смысл отслеживать неуспешные запуски по кодам ошибки от дочернего процесса
// 				const output = await ProcessHelper.ExecuteWithArgsWithRealtimeOutput(
// 					rccExePath,
// 					[
// 						"--lang=n",
// 						taxonomy_arg,
// 						normalization_graph_arg,
// 						formula_appendix,
// 						content
// 					],
// 					outputChannel);
// 				outputChannel.appendLine("XP :: Building normalization formulas finished!");
// 				outputChannel.appendLine("");

// 				// Анализируем вывод утилиты на наличие ошибок и предупреждений
// 				// TODO: Возможно паттернов вывода больше. Нужно описать разные ситуации.
// 				const outputParser = new RCCOutputParser();
// 				const ruleFileDiagnostics = outputParser.parse(output);

// 				// Выводим ошибки и замечания для тестируемого правила.
// 				for (const rfd of ruleFileDiagnostics) {
// 					this.config.getDiagnosticCollection().set(rfd.Uri, rfd.Diagnostics);
// 				}

// 				// Если есть ошибки, то прерываем цепочку выполнения
// 				return this.not_contains_errors(ruleFileDiagnostics);
// 			}
// 			catch(error) {
// 				ExtensionHelper.showUserError(`Произошла неожиданная ошибка: ${error.message}`);
// 				return false;
// 			}
// 		});
// 	}

// 	/** Функция запуска утилиты создания схемы табличных списков
// 	 *
// 	 * @param buildDirectory - путь до корня директории сборки
// 	 * @returns true - успех, продолжаем цепочку выполнения
// 	 * 			false - ошибка, прерываем цепочку выполнения
// 	 */
// 	private async make_table_schema(buildDirectory: string): Promise<boolean> {
// 		return vscode.window.withProgress({
// 			location: vscode.ProgressLocation.Notification,
// 			cancellable: false,
// 			title: `Сбор схемы табличных списков`
// 		}, async (progress) => {
// 			try {
// 				const outputChannel = this.config.getOutputChannel();
// 				outputChannel.appendLine("----------------------------------------");
// 				outputChannel.appendLine("XP :: Building table list schema...");
// 				outputChannel.appendLine("----------------------------------------");

// 				/** Типовая команда выглядит так:
// 				 *
// 				 * SDK\build-tools\master\0.22.821\mktables.exe
// 				 * 		join
// 				 * 		--contract=\_extra\tabular_lists\tables_contract.yaml
// 				 * 		--out-directory=\Output rules\packages
// 				 *
// 				 */
// 				// Формируем параметры запуска утилиты
// 				const mktablesExePath = this.config.getMkTablesPath();
// 				const contract_arg = "--contract=" + this.config.getTablesContract();
// 				const root = this.config.getRootByPath(buildDirectory);
// 				const rootFolder = path.basename(root);
// 				const outputFolder = this.config.getOutputDirectoryPath(rootFolder);
// 				const output_dir_arg = "--out-directory=" + outputFolder;
// 				const content = buildDirectory;

// 				// Запускаем утилиту с параметрами
// 				// TODO: Возможно есть смысл отслеживать неуспешные запуски по кодам ошибки от дочернего процесса
// 				const output = await ProcessHelper.ExecuteWithArgsWithRealtimeOutput(
// 					mktablesExePath,
// 					[
// 						"join",
// 						contract_arg,
// 						output_dir_arg,
// 						content
// 					],
// 					outputChannel);
// 				outputChannel.appendLine("XP :: Building table list schema finished!");
// 				outputChannel.appendLine("");

// 				// Анализируем вывод утилиты на наличие ошибок и предупреждений
// 				// TODO: Возможно паттернов вывода больше. Нужно описать разные ситуации.
// 				const outputParser = new MktablesOutputParser();
// 				const ruleFileDiagnostics = outputParser.parse(output);

// 				// Выводим ошибки и замечания для тестируемого правила.
// 				for (const rfd of ruleFileDiagnostics) {
// 					this.config.getDiagnosticCollection().set(rfd.Uri, rfd.Diagnostics);
// 				}

// 				// Если есть ошибки, то прерываем цепочку выполнения
// 				return this.not_contains_errors(ruleFileDiagnostics);
// 			}
// 			catch(error) {
// 				ExtensionHelper.showUserError(`Произошла неожиданная ошибка: ${error.message}`);
// 				return false;
// 			}
// 		});
// 	}

// 	/** Функция запуска утилиты создания БД табличных списков
// 	 *
// 	 * @returns true - успех, продолжаем цепочку выполнения
// 	 * 			false - ошибка, прерываем цепочку выполнения
// 	 */
// 	private async make_fpta(buildDirectory: string): Promise<boolean> {
// 		return vscode.window.withProgress({
// 			location: vscode.ProgressLocation.Notification,
// 			cancellable: false,
// 			title: `Создание базы табличных списков`
// 		}, async (progress) => {
// 			try {
// 				const outputChannel = this.config.getOutputChannel();
// 				outputChannel.appendLine("----------------------------------------");
// 				outputChannel.appendLine("XP :: Building table list database...");
// 				outputChannel.appendLine("----------------------------------------");

// 				/** Типовая команда выглядит так:
// 				 *
// 				 *  SDK\release-24.0\24.0.7173\fpta_filler.exe
// 				 * 		--schema=\Output\schema.json
// 				 * 		--input=\Output\correlation_defaults.json
// 				 * 		--database=\Output\fpta_db.db
// 				 * 		--fillType=All
// 				 * 		--filesize=150
// 				 *
// 				 */
// 				// Формируем параметры запуска утилиты
// 				const fptaFillExePath = this.config.getFPTAFillerPath();
// 				const fillType = "--fillType=All";
// 				const root = this.config.getRootByPath(buildDirectory);
// 				const rootFolder = path.basename(root);
// 				const schema_arg = "--schema=" + this.config.getSchemaFullPath(rootFolder);
// 				const correlation_def_arg = "--input=" + this.config.getCorrelationDefaultsFilePath(rootFolder);
// 				const database_arg = "--database=" + this.config.getFptaDbFilePath(rootFolder);
// 				const fileSize = "--filesize=150";

// 				// Запускаем утилиту с параметрами
// 				// TODO: Возможно есть смысл отслеживать неуспешные запуски по кодам ошибки от дочернего процесса
// 				const output = await ProcessHelper.ExecuteWithArgsWithRealtimeOutput(
// 					fptaFillExePath,
// 					[
// 						fillType,
// 						schema_arg,
// 						correlation_def_arg,
// 						database_arg,
// 						fileSize
// 					],
// 					outputChannel);
// 				outputChannel.appendLine("XP :: Building table list database finished!");
// 				outputChannel.appendLine("");

// 				// Анализируем вывод утилиты на наличие ошибок и предупреждений
// 				// TODO: Возможно паттернов вывода больше. Нужно описать разные ситуации.
// 				const outputParser = new FillFPTAOutputParser();
// 				const ruleFileDiagnostics = outputParser.parse(output);

// 				// Выводим ошибки и замечания для тестируемого правила.
// 				for (const rfd of ruleFileDiagnostics) {
// 					this.config.getDiagnosticCollection().set(rfd.Uri, rfd.Diagnostics);
// 				}

// 				// Если есть ошибки, то прерываем цепочку выполнения
// 				return this.not_contains_errors(ruleFileDiagnostics);

// 			}
// 			catch(error) {
// 				ExtensionHelper.showUserError(`Произошла неожиданная ошибка: ${error.message}`);
// 				return false;
// 			}
// 		});
// 	}

// 	/** Функция запуска утилиты создания графа обогащений
// 	 *
// 	 * @param buildDirectory - путь до корня директории сборки
// 	 * @returns true - успех, продолжаем цепочку выполнения
// 	 * 			false - ошибка, прерываем цепочку выполнения
// 	 */
// 	private async make_enrichments(buildDirectory: string): Promise<boolean> {
// 		return vscode.window.withProgress({
// 			location: vscode.ProgressLocation.Notification,
// 			cancellable: false,
// 			title: `Сбор графа формул обогащения`
// 		}, async (progress) => {
// 			try {
// 				const outputChannel = this.config.getOutputChannel();
// 				outputChannel.appendLine("----------------------------------------");
// 				outputChannel.appendLine("XP :: Building enrichments' graphs...");
// 				outputChannel.appendLine("----------------------------------------");

// 				/** Типовая команда выглядит так:
// 				 *
// 				 * SDK\ptsiem-sdk\release-25.0\25.0.10201\cli\rcc.exe
// 				 * 		--lang=n
// 				 * 		--taxonomy=\SDK\taxonomy\release-25.0\25.0.199\taxonomy.json
// 				 * 		--formula-appendix=SDK\contracts\xp_appendix\appendix.xp
// 				 * 		--output=\Output\formulas_graph.json
// 				 * 		\rules\windows
// 				 *
// 				 */
// 				// Формируем параметры запуска утилиты
// 				const rccExePath =  this.config.getRccCli();
// 				const taxonomy_arg = "--taxonomy=" + this.config.getTaxonomyFullPath();
// 				const root = this.config.getRootByPath(buildDirectory);
// 				const rootFolder = path.basename(root);
// 				const enrichment_graph_arg = "--output=" + this.config.getEnrulesGraphFilePath(rootFolder);
// 				const schema_arg = "--schema=" + this.config.getSchemaFullPath(rootFolder);
// 				const lib_path_arg = "--lib-path=" + this.config.getRulesDirFilters();

// 				// Запускаем утилиту с параметрами
// 				// TODO: Возможно есть смысл отслеживать неуспешные запуски по кодам ошибки от дочернего процессаs
// 				const output = await ProcessHelper.ExecuteWithArgsWithRealtimeOutput(
// 					rccExePath,
// 					[
// 						"--lang=e",
// 						taxonomy_arg,
// 						enrichment_graph_arg,
// 						schema_arg,
// 						lib_path_arg,
// 						buildDirectory
// 					],
// 					outputChannel);
// 				outputChannel.appendLine("XP :: Building enrichments' graphs finished!");
// 				outputChannel.appendLine("");

// 				// Анализируем вывод утилиты на наличие ошибок и предупреждений
// 				// TODO: Возможно паттернов вывода больше. Нужно описать разные ситуации.
// 				const outputParser = new RCCOutputParser();
// 				const ruleFileDiagnostics = outputParser.parse(output);

// 				// Выводим ошибки и замечания для тестируемого правила.
// 				for (const rfd of ruleFileDiagnostics) {
// 					this.config.getDiagnosticCollection().set(rfd.Uri, rfd.Diagnostics);
// 				}

// 				// Если есть ошибки, то прерываем цепочку выполнения
// 				return this.not_contains_errors(ruleFileDiagnostics);

// 			}
// 			catch(error) {
// 				ExtensionHelper.showUserError(`Произошла неожиданная ошибка: ${error.message}`);
// 				return false;
// 			}
// 		});
// 	}

// 	/** Функция запуска утилиты создания графа корреляций
// 	 *
// 	 * @param buildDirectory - путь до корня директории сборки
// 	 * @returns true - успех, продолжаем цепочку выполнения
// 	 * 			false - ошибка, прерываем цепочку выполнения
// 	 */
// 	private async make_correlations(buildDirectory: string): Promise<boolean> {
// 		return vscode.window.withProgress({
// 			location: vscode.ProgressLocation.Notification,
// 			cancellable: false,
// 			title: `Сбор графа формул корреляции`
// 		}, async (progress) => {
// 			try {
// 				const outputChannel = this.config.getOutputChannel();
// 				outputChannel.appendLine("----------------------------------------");
// 				outputChannel.appendLine("XP :: Building correlations' graphs...");
// 				outputChannel.appendLine("----------------------------------------");

// 				/** Типовая команда выглядит так:
// 				 *
// 				 * \SDK\ptsiem-sdk\release-25.0\25.0.10201\cli\rcc.exe
// 				 * 		--lang=c
// 				 * 		--taxonomy=\SDK\taxonomy\release-25.0\25.0.199\taxonomy.json
// 				 * 		--output=\Output\corrules_graph.json
// 				 * 		--schema=Output\schema.json
// 				 * 		--lib-path=\rules\common\rules_filters
// 				 * 		rules\packages
// 				 *
// 				 */
// 				// Формируем параметры запуска утилиты
// 				const rccExePath = this.config.getRccCli();
// 				const taxonomy_arg = "--taxonomy=" + this.config.getTaxonomyFullPath();
// 				const root = this.config.getRootByPath(buildDirectory);
// 				const rootFolder = path.basename(root);
// 				const correlation_graph_arg = "--output=" + this.config.getCorrulesGraphFilePath(rootFolder);
// 				const schema_arg = "--schema=" + this.config.getSchemaFullPath(rootFolder);
// 				const lib_path_arg = "--lib-path=" + this.config.getRulesDirFilters();

// 				// Запускаем утилиту с параметрами
// 				// TODO: Возможно есть смысл отслеживать неуспешные запуски по кодам ошибки от дочернего процесса
// 				const output = await ProcessHelper.ExecuteWithArgsWithRealtimeOutput(
// 					rccExePath,
// 					[
// 						"--lang=c",
// 						taxonomy_arg,
// 						correlation_graph_arg,
// 						schema_arg,
// 						lib_path_arg,
// 						buildDirectory
// 					],
// 					this.config.getOutputChannel()
// 				);
// 				outputChannel.appendLine("XP :: Building correlations' graphs finished!");
// 				outputChannel.appendLine("");

// 				// Анализируем вывод утилиты на наличие ошибок и предупреждений
// 				// TODO: Возможно паттернов вывода больше. Нужно описать разные ситуации.
// 				const outputParser = new RCCOutputParser();
// 				const ruleFileDiagnostics = outputParser.parse(output);

// 				// Выводим ошибки и замечания для тестируемого правила.
// 				for (const rfd of ruleFileDiagnostics) {
// 					this.config.getDiagnosticCollection().set(rfd.Uri, rfd.Diagnostics);
// 				}

// 				// Если есть ошибки, то прерываем цепочку выполнения
// 				return this.not_contains_errors(ruleFileDiagnostics);

// 			}
// 			catch(error) {
// 				ExtensionHelper.showUserError(`Произошла неожиданная ошибка: ${error.message}`);
// 				return false;
// 			}
// 		});
// 	}

// 	/** Функция запуска утилиты создания графа правил локализации
// 	 *
// 	 * @param buildDirectory - путь до корня директории сборки
// 	 * @returns true - успех, продолжаем цепочку выполнения
// 	 * 			false - ошибка, прерываем цепочку выполнения
// 	 */
// 	private async make_localizations(buildDirectory: string): Promise<boolean> {
// 		return vscode.window.withProgress({
// 			location: vscode.ProgressLocation.Notification,
// 			cancellable: false,
// 			title: `Сбор правил локализации`
// 		}, async (progress) => {
// 			try {
// 				const outputChannel = this.config.getOutputChannel();
// 				outputChannel.appendLine("----------------------------------------");
// 				outputChannel.appendLine("XP :: Building localizations' rules...");
// 				outputChannel.appendLine("----------------------------------------");

// 				/** Типовая команда выглядит так:
// 				 *
// 				 * \build-tools\master\0.20.680\build_l10n_rules.exe
// 				 * 		--out=\Output
// 				 * 		--inject_buildinfo_version=0.0.0-default
// 				 * 		rules\windows
// 				 *
// 				 */
// 				// Формируем параметры запуска утилиты
// 				const i10nExePath = this.config.getLocalizationBuilder();
// 				const root = this.config.getRootByPath(buildDirectory);
// 				const rootFolder = path.basename(root);
// 				const outputFolder = this.config.getOutputDirectoryPath(rootFolder);
// 				const out_arg = "--out=" + outputFolder;
// 				const inject_build_info_arg = "--inject_buildinfo_version=0.0.0-default";
// 				const content = buildDirectory;

// 				// Запускаем утилиту с параметрами
// 				// TODO: Возможно есть смысл отслеживать неуспешные запуски по кодам ошибки от дочернего процесса
// 				const output = await ProcessHelper.ExecuteWithArgsWithRealtimeOutput(
// 					i10nExePath,
// 					[
// 						out_arg,
// 						inject_build_info_arg,
// 						content
// 					],
// 					this.config.getOutputChannel());
// 				outputChannel.appendLine("XP :: Building localizations' rules finished!");
// 				outputChannel.appendLine("");

// 				// Анализируем вывод утилиты на наличие ошибок и предупреждений
// 				// TODO: Возможно паттернов вывода больше. Нужно описать разные ситуации.
// 				const outputParser = new BuildLocsOutputParser();
// 				const ruleFileDiagnostics = outputParser.parse(output);

// 				// Выводим ошибки и замечания для тестируемого правила.
// 				for (const rfd of ruleFileDiagnostics) {
// 					this.config.getDiagnosticCollection().set(rfd.Uri, rfd.Diagnostics);
// 				}

// 				// Если есть ошибки, то прерываем цепочку выполнения
// 				return this.not_contains_errors(ruleFileDiagnostics);

// 			}
// 			catch(error) {
// 				ExtensionHelper.showUserError(`Произошла неожиданная ошибка: ${error.message}`);
// 				return false;
// 			}
// 		});
// 	}

// 	/** Функция запуска утилиты проверки интеграционных тестов
// 	 *
// 	 * @param buildDirectory - путь до корня директории сборки
// 	 * @returns true - успех, продолжаем цепочку выполнения
// 	 * 			false - ошибка, прерываем цепочку выполнения
// 	 */
// 	public async runIntegrationTests(rule: RuleBaseItem): Promise<RuleFileDiagnostics[]|null> {
// 		return vscode.window.withProgress({
// 			location: vscode.ProgressLocation.Notification,
// 			cancellable: false,
// 			title: `Запуск интеграционных тестов`
// 		}, async (progress) => {
// 			try {

// 				const outputChannel = this.config.getOutputChannel();

// 				outputChannel.appendLine("----------------------------------------");
// 				outputChannel.appendLine("XP :: Run Integration Tests...");
// 				outputChannel.appendLine("----------------------------------------");

// 				/** Типовая команда выглядит так:
// 				 *
// 				 * SDK\build-tools\master\0.21.743\siemkb_tests.exe
// 				 * 		--sdk=SDK\ptsiem-sdk\release-25.0\25.0.8934
// 				 * 		--temp=\Output\temp
// 				 * 		--nfgraph=\Output\formulas_graph.json
// 				 * 		--crgraph=\Output\corrules_graph.json
// 				 * 		--fpta-defaults=\Output\correlation_defaults.json
// 				 * 		\packages\esc\correlation_rules\ESC_Remote_System_Discovery
// 				 *
// 				 */
// 				// Формируем параметры запуска утилиты
// 				const folder = path.basename(rule.getPackagePath(this.config));
// 				const testsExePath = this.config.getSiemKBTests();
// 				const sdk_arg = "--sdk=" + this.config.getSiemSdkDirectoryPath();
// 				const tmp_arg = "--temp=" + path.join(this.config.getTmpDirectoryPath(), folder);
// 				const root = this.config.getRootByPath(rule.getDirectoryPath());
// 				const rootFolder = path.basename(root);
// 				const normalization_graph_arg = "--nfgraph=" + this.config.getNormalizationGraphFilePath(rootFolder);
// 				const correlation_graph_arg = "--crgraph=" + this.config.getCorrulesGraphFilePath(rootFolder);
// 				const fpta_defaults_arg = "--fpta-defaults=" + this.config.getCorrelationDefaultsFilePath(rootFolder);
// 				const buildDirectory = rule.getDirectoryPath();

// 				// Запускаем утилиту с параметрами
// 				// TODO: Возможно есть смысл отслеживать неуспешные запуски по кодам ошибки от дочернего процесса
// 				const output = await ProcessHelper.ExecuteWithArgsWithRealtimeOutput(
// 					testsExePath,
// 					[
// 						"-k",
// 						"--color",
// 						"--teamcity",
// 						"--sdk-log-level=trace",
// 						sdk_arg,
// 						tmp_arg,
// 						normalization_graph_arg,
// 						correlation_graph_arg,
// 						fpta_defaults_arg,
// 						buildDirectory
// 					],
// 					outputChannel);
// 				outputChannel.appendLine("XP :: Run Integration Tests finished!");
// 				outputChannel.appendLine("");

// 				// Анализируем вывод утилиты на наличие ошибок и предупреждений
// 				// TODO: Возможно паттернов вывода больше. Нужно описать разные ситуации.
// 				const outputParser = new SiemKBTestsOutputParser(rule.getDirectoryPath());
// 				let ruleFileDiagnostics = outputParser.parse(output);
// 				ruleFileDiagnostics = await outputParser.correctDiagnosticBeginCharRanges(ruleFileDiagnostics);

// 				// Выводим ошибки и замечания для тестируемого правила.
// 				for (const rfd of ruleFileDiagnostics) {
// 					this.config.getDiagnosticCollection().set(rfd.Uri, rfd.Diagnostics);
// 				}

// 				return ruleFileDiagnostics;
// 			}
// 			catch(error) {
// 				ExtensionHelper.showUserError(`Произошла неожиданная ошибка: ${error.message}`);
// 				return null;
// 			}
// 		});
// 	}

// 	/** Функция запуска утилиты нормализации сырых событий
// 	 *
// 	 * @param buildDirectory - путь до корня директории сборки
// 	 * @returns true - успех, продолжаем цепочку выполнения
// 	 * 			false - ошибка, прерываем цепочку выполнения
// 	 */
// 	public async runStandaloneNormalization(rawEventPath: string): Promise<string> {
// 		try {

// 			const outputChannel = this.config.getOutputChannel();
// 			// Очищаем и показываем окно Output.
// 			outputChannel.clear();
// 			outputChannel.show();

// 			outputChannel.appendLine("----------------------------------------");
// 			outputChannel.appendLine("XP :: Run Fast Normalization...");
// 			outputChannel.appendLine("----------------------------------------");

// 			/** Типовая команда выглядит так:
// 			 *
// 			 *  SDK\ptsiem-sdk\release-25.0\25.0.8934\cli\normalizer-cli.exe
// 			 * 		--not-norm=\Output\not_normalized.json
// 			 * 		--stat
// 			 * 		--raw
// 			 * 		--mime=text/plain
// 			 * 		C:\Users\aw350m3\Desktop\PTSIEMSDK_GUI_24_02_21\PTSIEMSDK_GUI\bin\Debug\net461\Output\formulas_graph.json
// 			 *
// 			 */
// 			// Формируем параметры запуска утилиты
// 			const normalizerExePath = this.config.getNormalizerCli();
// 			const root = this.config.getRootByPath(rawEventPath);
// 			const rootFolder = path.basename(root);
// 			const normalization_graph_arg = this.config.getNormalizationGraphFilePath(rootFolder);

// 			// Записываем в лог выполнения строку запуска
// 			outputChannel.appendLine(
// 				`XP :: Run command: type ${rawEventPath} | ${normalizerExePath} ${normalization_graph_arg}`
// 			);

// 			// Запускаем утилиту с параметрами
// 			// TODO: Возможно есть смысл отслеживать неуспешные запуски по кодам ошибки от дочернего процесса
// 			const output = await ProcessHelper.StdIOExecuteWithArgsWithRealtimeOutput(
// 				rawEventPath,
// 				normalizerExePath,
// 				[
// 					normalization_graph_arg
// 				],
// 				outputChannel)
// 				.catch(error => ExtensionHelper.showUserError(`Произошла неожиданная ошибка: ${error}`)
// 			);

// 			outputChannel.appendLine("XP :: Run Fast Normalization finished!");
// 			outputChannel.appendLine("");
// 			return output;
// 		}
// 		catch(error) {
// 			ExtensionHelper.showUserError(`Произошла неожиданная ошибка: ${error}`);
// 			return null;
// 		}
// 	}

//     /** Функция сборки всех графов для загруженной рабочей области.
// 	 * Она последовательно запускает утилиты создания того или иного артефакта
// 	 *
// 	 * @returns void
// 	 */
// 	public async buildAllWorkspaceWithRestrictions(restrictions: string[]) : Promise<void> {
// 		for (const r of restrictions){
// 			await this.buildGraphsWithRestriction(r);
// 		}
// 	}

//     /** Функция сборки всех графов для загруженной рабочей области.
// 	 * Она последовательно запускает утилиты создания того или иного артефакта
// 	 *
// 	 * @returns void
// 	 */
// 	public async buildAllWorkspace() : Promise<void> {
// 		await this.buildGraphs(
// 			null,
// 			null,
// 			null,
// 			null,
// 			null);
// 	}

// 	/** Функция сборки всех графов, необходимых для правила без зависимостей от подправил.
// 	 * Она последовательно запускает утилиты создания того или иного артефакта
// 	 *
// 	 * @returns void
// 	 */
// 	public async buildGraphsWithRestriction(
// 		basePath: string
// 		) : Promise<void> {

// 		return vscode.window.withProgress({
// 			location: vscode.ProgressLocation.Notification,
// 			cancellable: false,
// 			title: `Сбор всех графов`
// 		}, async (progress) => {
// 			// TODO: fix this
// 			const folder = path.basename(basePath);
// 			try {
// 				// Создаем директории, в которые утилиты будут сохранять результаты запуска
// 				const root = this.config.getRootByPath(basePath);
// 				const rootFolder = path.basename(root);
// 				const outputFolder = this.config.getOutputDirectoryPath(rootFolder);
// 				const outputDirectory = path.join(outputFolder, folder);

// 				// Создаем директорию, если ее нет
// 				if (!fs.existsSync(outputDirectory)){
// 					fs.mkdirSync(outputDirectory, {recursive: true});
// 				}

// 				// Очищаем папку с результатами предыдущих запусков
// 				// поскольку запущен полный сбор всех артефактов
// 				for (const file of
// 						(await fs.promises.readdir(outputDirectory, { withFileTypes: true }))
// 							.filter(e => e.isFile())
// 							.map(e => e.name)) {
// 					await fs.promises.unlink(path.join(outputDirectory, file));
// 				}

// 				// Последовательно запускаем утилиты создания графов
// 				if (await this.buildNormalizations(basePath)) {
// 					if (await this.make_table_schema(basePath)) {
// 						if (await this.make_fpta(basePath)) {
// 							if (await this.make_enrichments(basePath)) {
// 								if (await this.make_correlations(basePath)) {
// 									if (await this.make_localizations(basePath)) {
// 										ExtensionHelper.showUserInfo(`Все графы для пакета ${folder} успешно собраны.`);
// 										return;
// 									}
// 								}
// 							}
// 						}
// 					}
// 				}
// 				ExtensionHelper.showUserError(`Ошибка сборки графов для пакета ${folder}! Смотри 'Diagnostics' и 'Output: eXtract and Processing'!`);
// 			}
// 			catch(error) {
// 				ExtensionHelper.showUserError(`Произошла ошибка при сборке графов для пакета ${folder}: ${error}`);
// 			}
// 		});
// 	}

// 	public async buildGraphsForStandaloneRule(rule: RuleBaseItem) : Promise<void> {

// 		return vscode.window.withProgress({
// 			location: vscode.ProgressLocation.Notification,
// 			cancellable: false,
// 			title: `Сбор всех графов`
// 		}, async (progress) => {
// 			try {
// 				// Создаем директории, в которые утилиты будут сохранять результаты запуска
// 				const root = this.config.getRootByPath(rule.getDirectoryPath());
// 				const rootFolder = path.basename(root);
// 				const outputDirectory = this.config.getOutputDirectoryPath(rootFolder);

// 				// Поскольку запускаем полный сбор артефактов,
// 				// то очищаем коллекцию ошибок и предупреждений
// 				this.config.getDiagnosticCollection().clear();

// 				// Очищаем и показываем окно Output.
// 				this.config.getOutputChannel().clear();
// 				this.config.getOutputChannel().show();

// 				const basePath = rule.getPackagePath(this.config);

// 				// Последовательно запускаем утилиты создания графов
// 				const context = this.config.getContext();
// 				const storage = context.workspaceState.get<string>("FastIntegrationTestsState");
// 				if (storage== "Disabled") {
// 					// Очищаем папку с результатами предыдущих запусков
// 					// поскольку запущен полный сбор всех артефактов
// 					for (const file of
// 						(await fs.promises.readdir(outputDirectory, { withFileTypes: true }))
// 							.filter(e => e.isFile())
// 							.map(e => e.name)) {
// 								await fs.promises.unlink(path.join(outputDirectory, file));
// 							}

// 					if (!await this.buildNormalizations(basePath)) {throw new XpException("Ошибка сбора графов!"); }
// 					if (!await this.make_table_schema(basePath)) { throw new XpException("Ошибка сбора графов!"); }
// 					if (!await this.make_fpta(basePath)) { throw new XpException("Ошибка сбора графов!"); }
// 					if (!await this.make_enrichments(basePath)) { throw new XpException("Ошибка сбора графов!"); }
// 				}
// 				if (!await this.make_correlations(rule.getDirectoryPath())){throw new Error("Ошибка сбора графов!");}
// 				if (!await this.make_localizations(rule.getDirectoryPath())){throw new Error("Ошибка сбора графов!");}
// 				ExtensionHelper.showUserInfo("Все графы успешно собраны");
// 			}
// 			catch(error) {
// 				ExtensionHelper.showUserError(`Произошла неожиданная ошибка: ${error}`);
// 			}
// 		});
// 	}

// 	public async buildGraphsForComplexRule(rule: RuleBaseItem) : Promise<void> {

// 		return vscode.window.withProgress({
// 			location: vscode.ProgressLocation.Notification,
// 			cancellable: false,
// 			title: `Сбор всех графов`
// 		}, async (progress) => {
// 			try {
// 				// Создаем директории, в которые утилиты будут сохранять результаты запуска
// 				const root = this.config.getRootByPath(rule.getDirectoryPath());
// 				const rootFolder = path.basename(root);
// 				const outputDirectory = this.config.getOutputDirectoryPath(rootFolder);

// 				// Очищаем папку с результатами предыдущих запусков
// 				// поскольку запущен полный сбор всех артефактов
// 				for (const file of
// 						(await fs.promises.readdir(outputDirectory, { withFileTypes: true }))
// 							.filter(e => e.isFile())
// 							.map(e => e.name)) {
// 					await fs.promises.unlink(path.join(outputDirectory, file));
// 				}

// 				// Поскольку запускаем полный сбор артефактов,
// 				// то очищаем коллекцию ошибок и предупреждений
// 				this.config.getDiagnosticCollection().clear();

// 				// Очищаем и показываем окно Output.
// 				this.config.getOutputChannel().clear();
// 				this.config.getOutputChannel().show();

// 				const basePath = rule.getPackagePath(this.config);

// 				// Последовательно запускаем утилиты создания графов
// 				const workspaceState = this.config.getContext().workspaceState;
// 				const fastIntegrationTestsState = workspaceState.get<string>("FastIntegrationTestsState");
// 				if (fastIntegrationTestsState == "Disabled") {
// 					if (!await this.buildNormalizations(basePath)){ throw new Error("Ошибка сбора графов!"); }
// 					if (!await this.make_table_schema(basePath)) { throw new Error("Ошибка сбора графов!"); }
// 					if (!await this.make_fpta(basePath)) { throw new Error("Ошибка сбора графов!"); }
// 					if (!await this.make_enrichments(basePath)) { throw new Error("Ошибка сбора графов!"); }
// 				}
// 				if (!await this.make_correlations(rule.getContentRoot(this.config))){throw new Error("Ошибка сбора графов!");}
// 				if (!await this.make_localizations(rule.getDirectoryPath())){throw new Error("Ошибка сбора графов!");}
// 				ExtensionHelper.showUserInfo("Все графы успешно собраны.");
// 			}
// 			catch(error) {
// 				ExtensionHelper.showUserError(`Произошла неожиданная ошибка: ${error}`);
// 			}
// 		});
// 	}

//     /** Функция сборки всех графов, необходимых для правила без зависимостей от подправил.
// 	 * Она последовательно запускает утилиты создания того или иного артефакта
// 	 *
// 	 * @returns void
// 	 */
// 	public async buildGraphs(
// 		normalizations_path: string,
// 		tabular_lists_path: string,
// 		enrichments_path: string,
// 		correlations_path: string,
// 		localizations_path: string,
// 		) : Promise<void> {

// 		return vscode.window.withProgress({
// 			location: vscode.ProgressLocation.Notification,
// 			cancellable: false,
// 			title: `Сбор всех графов`
// 		}, async (progress) => {
// 			try {
// 				// Создаем директории, в которые утилиты будут сохранять результаты запуска
// 				const root = this.config.getRootByPath(normalizations_path);
// 				const rootFolder = path.basename(root);
// 				const outputDirectory = this.config.getOutputDirectoryPath(rootFolder);

// 				// Очищаем папку с результатами предыдущих запусков
// 				// поскольку запущен полный сбор всех артефактов
// 				for (const file of
// 						(await fs.promises.readdir(outputDirectory, { withFileTypes: true }))
// 							.filter(e => e.isFile())
// 							.map(e => e.name)) {
// 					await fs.promises.unlink(path.join(outputDirectory, file));
// 				}

// 				// Поскольку запускаем полный сбор артефактов,
// 				// то очищаем коллекцию ошибок и предупреждений
// 				this.config.getDiagnosticCollection().clear();

// 				// Очищаем и показываем окно Output.
// 				this.config.getOutputChannel().clear();
// 				this.config.getOutputChannel().show();

// 				// Последовательно запускаем утилиты создания графов
// 				if (await this.buildNormalizations(normalizations_path)){
// 					if (await this.make_table_schema(tabular_lists_path)){
// 						if (await this.make_fpta(tabular_lists_path)){
// 							if (await this.make_enrichments(enrichments_path)){
// 								if (await this.make_correlations(correlations_path)){
// 									if (await this.make_localizations(localizations_path)){
// 										ExtensionHelper.showUserInfo("Все графы успешно собраны.");
// 										return;
// 									}
// 								}
// 							}
// 						}
// 					}
// 				}
// 				ExtensionHelper.showUserError("Ошибка сбора графов! Смотри 'Diagnostics' и 'Output: eXtract and Processing'!");
// 			}
// 			catch(error) {
// 				ExtensionHelper.showUserError(`Произошла неожиданная ошибка: ${error}`);
// 			}
// 		});
// 	}

// 	/** Функция сборки графов корреляций и локализаций.
// 	 * Она последовательно запускает утилиты создания того или иного артефакта
// 	 *
// 	 * @returns void
// 	 */
// 	public async fastBuildGraphs(
// 		correlations_path: string,
// 		localizations_path: string,
// 		) : Promise<void> {

// 		return vscode.window.withProgress({
// 			location: vscode.ProgressLocation.Notification,
// 			cancellable: false,
// 			title: `Сбор графов корреляций и локализаций`
// 		}, async (progress) => {
// 			try {
// 				// Поскольку запускаем полный сбор артефактов,
// 				// то очищаем коллекцию ошибок и предупреждений
// 				this.config.getDiagnosticCollection().clear();

// 				// Очищаем и показываем окно Output.
// 				this.config.getOutputChannel().clear();
// 				this.config.getOutputChannel().show();

// 				// Последовательно запускаем утилиты создания графов
// 				if (await this.make_correlations(correlations_path)){
// 					if (await this.make_localizations(localizations_path)){
// 						ExtensionHelper.showUserInfo("Графы корреляций и локализаций успешно собраны.");
// 						return;
// 					}
// 				}
// 				ExtensionHelper.showUserError("Ошибка сбора графов! Смотри 'Diagnostics' и 'Output: eXtract and Processing'!");
// 			}
// 			catch(error) {
// 				ExtensionHelper.showUserError(`Произошла неожиданная ошибка: ${error}`);
// 			}
// 		});
// 	}

// 	public async createSIEMPackager(): Promise<vscode.ProcessExecution> {
// 		try {
// 			/** Типовая команда выглядит так:
// 			 *
// 			 *  SDK\ptsiem-sdk\release-25.0\25.0.8934\cli\normalizer-cli.exe
// 			 *
// 			 */
// 			// Формируем параметры запуска утилиты
// 			const packagerExePath = this.config.getKbPackFullPath();
// 			// TODO: fix parameter getRootByPath
// 			const root = this.config.getRootByPath("");
// 			const rootFolder = path.basename(root);
// 			const normalization_graph_arg = this.config.getNormalizationGraphFilePath(rootFolder);

// 			return new vscode.ProcessExecution(
// 				packagerExePath,
// 				[
// 					normalization_graph_arg
// 				]);
// 		}
// 		catch(error) {
// 			ExtensionHelper.showUserError(`Произошла неожиданная ошибка: ${error}`);
// 			return null;
// 		}
// 	}

// 	// public async createEDRPackager(basePath: string): Promise<vscode.ShellExecution> {
// 	// 	try {
// 	// 		const folder = path.basename(basePath);
// 	// 		/** Типовая команда выглядит так:
// 	// 		 *
// 	// 		 *  SDK\ptsiem-sdk\release-25.0\25.0.8934\cli\normalizer-cli.exe
// 	// 		 *
// 	// 		 */
// 	// 		// Формируем параметры запуска утилиты
// 	// 		const script = `python ${path.join(this._kbPaths.getTools(), "gen_correlator_config.py")}`;
// 	// 		const mvdir = `--mvdir ${path.join(this._kbPaths.getWorkspaceRoot(), "resources", "correlator", "1.0.0")}`;
// 	// 		const crdir = `--crdir ${this.config.getOutputDirectoryPath(folder)}`;
// 	// 		const taxonomy = `--taxonomy ${this.config.getTaxonomyFullPath(true)}`;
// 	// 		const metainfo = `--metainfo ${path.join(basePath, "metainfo.json")}`;
// 	// 		const commandLine = `${script} ${mvdir} ${crdir} ${taxonomy} ${metainfo}`;
// 	// 		return new vscode.ShellExecution(commandLine);
// 	// 	}
// 	// 	catch(error) {
// 	// 		ExtensionHelper.showUserError(`Произошла неожиданная ошибка: ${error}`);
// 	// 		return null;
// 	// 	}
// 	// }
// }
