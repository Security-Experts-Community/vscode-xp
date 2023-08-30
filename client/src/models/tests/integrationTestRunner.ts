import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { SiemjConfigHelper } from '../siemj/siemjConfigHelper';
import { SiemJOutputParser, SiemjExecutionResult } from '../siemj/siemJOutputParser';
import { Configuration } from '../configuration';
import { RuleBaseItem } from '../content/ruleBaseItem';
import { TestStatus } from './testStatus';
import { SiemjConfBuilder } from '../siemj/siemjConfigBuilder';
import { XpException } from '../xpException';
import { SiemjManager } from '../siemj/siemjManager';
import { OperationCanceledException } from '../operationCanceledException';

export enum CompilationType {
	DontCompile = 0,
	CurrentRule,
	CurrentPackage,
	AllPackages,
	Auto
}

export class IntegrationTestRunnerOptions {
	keepTmpFiles = false;
	dependentCorrelations : string[] = [];
	correlationCompilation : CompilationType = CompilationType.Auto;
	cancellationToken?: vscode.CancellationToken;
}

export class IntegrationTestRunner {

	constructor(
		private _config: Configuration,
		private _outputParser: SiemJOutputParser) {
	}

	public async run(rule : RuleBaseItem, options?: IntegrationTestRunnerOptions) : Promise<SiemjExecutionResult> {

		// Проверяем наличие нужных утилит.
		this._config.getSiemkbTestsPath();

		const integrationTests = rule.getIntegrationTests();
		integrationTests.forEach(it => it.setStatus(TestStatus.Unknown));

		if(integrationTests.length == 0) {
			throw new XpException(`У правила ${rule.getName} не найдено интеграционных тестов`);
		}

		// Хотя бы у одного теста есть сырые события и код теста.
		const atLeastOneTestIsValid = integrationTests.some(it => {
			if(!it.getRawEvents()) {
				return false;
			}

			if(!it.getTestCode()) {
				return false;
			}

			return true;
		});

		if(!atLeastOneTestIsValid) {
			throw new XpException("Для запуска тестов нужно добавить сырые события и условия выполнения теста.");
		}

		await SiemjConfigHelper.clearArtifacts(this._config);

		const rootPath = rule.getContentRootPath(this._config);
		const rootFolder = path.basename(rootPath);
		const outputDirPath = this._config.getOutputDirectoryPath(rootFolder);
		if(!fs.existsSync(outputDirPath)) {
			await fs.promises.mkdir(outputDirPath, {recursive: true});
		}

		const configBuilder = new SiemjConfBuilder(this._config, rootPath);
		configBuilder.addNormalizationsGraphBuilding(false);
		configBuilder.addTablesSchemaBuilding();
		configBuilder.addTablesDbBuilding();
		configBuilder.addEnrichmentsGraphBuilding();

		// Параметры сборки графа корреляций взависимости от опций.
		switch (options.correlationCompilation) {
			case CompilationType.CurrentRule: {
				configBuilder.addCorrelationsGraphBuilding(true, rule.getDirectoryPath());
				break;
			}
			case CompilationType.CurrentPackage: {
				configBuilder.addCorrelationsGraphBuilding(true, rule.getPackagePath(this._config));
				break;
			}
			case CompilationType.AllPackages: {
				configBuilder.addCorrelationsGraphBuilding(true);
				break;
			}
			case CompilationType.Auto: {
				const dependentCorrelations = options.dependentCorrelations;
				if(dependentCorrelations.length === 0) {
					throw new XpException("Опции запуска интеграционных тестов неконсистентны.");
				}

				configBuilder.addCorrelationsGraphBuilding(true, options.dependentCorrelations);
				break;
			}
			default: {
				throw new XpException("Опции запуска интеграционных тестов неконсистентны.");
			}

		}
		
		// Получаем путь к директории с результатами теста.
		const tmpDirectoryPath = configBuilder.addTestsRun(rule.getDirectoryPath(), options.keepTmpFiles);
		const siemjConfContent = configBuilder.build();
		if(!siemjConfContent) {
			throw new XpException("Не удалось сгенерировать файл siemj.conf для заданного правила и тестов.");
		}

		const siemjManager = new SiemjManager(this._config, options.cancellationToken);
		const siemjExecutionResult = await siemjManager.executeSiemjConfig(rule, siemjConfContent);
		const executedTests = rule.getIntegrationTests();

		if(siemjExecutionResult.isInterrupted) {
			throw new OperationCanceledException(`Запуск интеграционных тестов правила ${rule.getName()} был отменён.`);
		}

		const siemjResult = await this._outputParser.parse(siemjExecutionResult.output);
		// Сохраняем результаты тестов.
		siemjResult.tmpDirectoryPath = tmpDirectoryPath;
		
		// Все тесты прошли, статусы не проверяем, все тесты зеленые.
		if(siemjResult.testsStatus) {
			executedTests.forEach(it => it.setStatus(TestStatus.Success));

			// Убираем ошибки по текущему правилу.
			const ruleFileUri = vscode.Uri.file(rule.getRuleFilePath());
			this._config.getDiagnosticCollection().set(ruleFileUri, []);
		} else {
			// Есть ошибки, все неуспешные тесты не прошли.
			executedTests
				.filter(it => it.getStatus() === TestStatus.Success)
				.forEach(it => it.setStatus(TestStatus.Failed));
		}

		// Если были не прошедшие тесты, выводим статус.
		// Непрошедшие тесты могу отсутствовать, если до тестов дело не дошло.
		if(siemjResult.failedTestNumbers.length > 0) {
			for(const failedTestNumber of siemjResult.failedTestNumbers) {
				executedTests[failedTestNumber - 1].setStatus(TestStatus.Failed);
			}
	
			executedTests.forEach( (it) => {
				if(it.getStatus() == TestStatus.Unknown) {
					it.setStatus(TestStatus.Success);
				}
			});
		}

		return siemjResult;
	}
}
