import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { ProcessHelper } from '../../helpers/processHelper';
import { SiemjConfigHelper } from '../siemj/siemjConfigHelper';
import { SiemJOutputParser } from '../siemj/siemJOutputParser';
import { Configuration } from '../configuration';
import { RuleBaseItem } from '../content/ruleBaseItem';
import { IntegrationTest } from './integrationTest';
import { TestStatus } from './testStatus';
import { SiemjConfBuilder } from '../siemj/siemjConfigBuilder';
import { XpException } from '../xpException';
import { TestHelper } from '../../helpers/testHelper';
import { Correlation } from '../content/correlation';
import { Enrichment } from '../content/enrichment';

export class IntegrationTestRunner {

	constructor(private _config: Configuration, private _outputParser: SiemJOutputParser) {
	}

	public async run(rule : RuleBaseItem) : Promise<IntegrationTest[]> {

		// Проверяем наличие нужных утилит.
		this._config.getSiemkbTestsPath();

		const integrationTests = rule.getIntegrationTests();
		integrationTests.forEach(it => it.setStatus(TestStatus.Unknown));

		if(integrationTests.length == 0) {
			throw new XpException(`У правила *${rule.getName}* не найдено интеграционных тестов`);
		}

		// Хотя бы у одного теста есть сырые события и код теста.
		const atLeastOneTestIsValid = integrationTests.some( it => {
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

		// Если корреляция с сабрулями, то собираем полный граф корреляций для отработок сабрулей из других пакетов.
		// В противном случае только корреляции из текущего пакета с правилами. Позволяет ускорить тесты.
		const ruleCode = await rule.getRuleCode();
		if(rule instanceof Correlation) {
			if(TestHelper.isRuleCodeContainsSubrules(ruleCode)) {
				configBuilder.addCorrelationsGraphBuilding();
			} else {
				configBuilder.addCorrelationsGraphBuilding(true, rule.getPackagePath(this._config));
			}
		}

		// Для обогащений собираем всегда полный граф корреляций, так как непонятно какая корреляция отработает на сырое событие.
		if(rule instanceof Enrichment) {
			configBuilder.addCorrelationsGraphBuilding();
		}
		
		configBuilder.addTestsRun(rule.getDirectoryPath());

		const siemjConfContent = configBuilder.build();

		if(!siemjConfContent) {
			throw new XpException("Не удалось сгенерировать файл siemj.conf для заданного правила и тестов.");
		}

		// Сохраняем конфигурационный файл для siemj во временную директорию.
		const siemjConfigPath = this._config.getTmpSiemjConfigPath(rootFolder);
		await SiemjConfigHelper.saveSiemjConfig(siemjConfContent, siemjConfigPath);

		// Очищаем и показываем окно Output.
		this._config.getOutputChannel().clear();
		
		// Типовая команда выглядит так:
		// "C:\\PTSIEMSDK_GUI.4.0.0.738\\tools\\siemj.exe" -c C:\\PTSIEMSDK_GUI.4.0.0.738\\temp\\siemj.conf main
		const siemjExePath = this._config.getSiemjPath();

		const siemjExecutionResult = await ProcessHelper.execute(
			siemjExePath,
			["-c", siemjConfigPath, "main"], {
				encoding : this._config.getSiemjOutputEncoding(),
				outputChannel : this._config.getOutputChannel()
			}
		);

		const siemjResult = await this._outputParser.parse(siemjExecutionResult.output);

		// Все тесты прошли, статусы не проверяем, все тесты зеленые.
		if(siemjResult.testStatus) {
			integrationTests.forEach(it => it.setStatus(TestStatus.Success));

			// Убираем ошибки по текущему правилу.
			const ruleFileUri = vscode.Uri.file(rule.getRuleFilePath());
			this._config.getDiagnosticCollection().set(ruleFileUri, []);

			this.clearTmpFiles(this._config, rootFolder);
			return integrationTests;
		} else {
			// Есть ошибки, все неуспешные тесты не прошли.
			integrationTests.filter(it => it.getStatus() === TestStatus.Success).forEach(it => it.setStatus(TestStatus.Failed));
		}

		// Либо тесты не прошли, либо мы до них не дошли.
		this._config.getOutputChannel().show();
		this._config.getDiagnosticCollection().clear();

		// Фильтруем диагностики по текущему правилу и показываем их в нативном окне.
		const diagnostics = siemjResult.fileDiagnostics.filter(rfd => {
			const path = rfd.uri.path;
			return path.includes(rule.getName());
		});

		for (const diagnostic of diagnostics) {
			this._config.getDiagnosticCollection().set(diagnostic.uri, diagnostic.diagnostics);
		}

		// Если были не прошедшие тесты, выводим статус.
		// Непрошедшие тесты могу отсутствовать, если до тестов дело не дошло.
		if(siemjResult.failedTestNumbers.length > 0) {
			for(const failedTestNumber of siemjResult.failedTestNumbers) {
				integrationTests[failedTestNumber - 1].setStatus(TestStatus.Failed);
			}
	
			integrationTests.forEach( (it) => {
				if(it.getStatus() == TestStatus.Unknown) {
					it.setStatus(TestStatus.Success);
				}
			});
		}

		return integrationTests;
	}

	private async clearTmpFiles(config : Configuration, rootFolder: string) : Promise<void> {
		
		try {
			const siemjConfigPath = config.getTmpDirectoryPath(rootFolder);
			return fs.promises.unlink(siemjConfigPath); 
		}
		catch (error) {
			// TODO:
		}
	}

	private readonly TESTS_SUCCESS_SUBSTRING = "All tests OK";
}
