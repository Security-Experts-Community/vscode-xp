import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { ProcessHelper } from '../../helpers/processHelper';
import { TestHelper } from '../../helpers/testHelper';
import { DialogHelper } from '../../helpers/dialogHelper';
import { Configuration } from '../configuration';
import { TestStatus } from './testStatus';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { BaseUnitTest } from './baseUnitTest';
import { UnitTestOptions, UnitTestRunner } from './unitTestsRunner';
import { UnitTestOutputParser } from './unitTestOutputParser';
import { SiemjManager } from '../siemj/siemjManager';
import { Log } from '../../extension';
import { XpException } from '../xpException';
import { RegExpHelper } from '../../helpers/regExpHelper';

export class CorrelationUnitTestsRunner implements UnitTestRunner {
  constructor(
    private config: Configuration,
    private _outputParser: UnitTestOutputParser
  ) {}

  public async run(test: BaseUnitTest, options?: UnitTestOptions): Promise<BaseUnitTest> {
    const root = this.config.getRootByPath(test.getRule().getDirectoryPath());
    const rootFolder = path.basename(root);
    const outputFolder = this.config.getOutputDirectoryPath(rootFolder);
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    const tmpDirPath = this.config.getTmpDirectoryPath(rootFolder);
    if (!fs.existsSync(tmpDirPath)) {
      fs.mkdirSync(tmpDirPath, { recursive: true });
    }

    if (!this.config.isKbOpened()) {
      DialogHelper.showError('Не выбрана база знаний');
      return;
    }

    const rule = test.getRule();
    const schemaFullPath = this.config.getSchemaFullPath(rootFolder);

    // Схема БД необходима для запуска юнит-тестов.
    if (!fs.existsSync(schemaFullPath)) {
      Log.info('Сборка схемы базы данных табличных списков, которая необходима для запуска тестов');

      const siemjManager = new SiemjManager(this.config);
      await siemjManager.buildSchema(rule);
    }

    // "C:\\Tools\\0.22.774\\any\\any\\win\\ecatest.exe"
    // 	--sdk "C:\Work\-=SIEM=-\Tools\25.0.9349\vc150\x86_64\win"
    // 	--taxonomy "C:\Work\-=SIEM=-\PTSIEMSDK_GUI.4.0.0.738\packages\taxonomy\develop\25.0.579\taxonomy.json"
    // 	--temp "C:\Work\Coding\PTSIEMSDK_GUI\PTSIEMSDK_GUI\bin\Debug\temp"
    // 	-s "c:\Work\-=SIEM=-\Content\knowledgebase\packages\esc_profiling\correlation_rules\devops\ESC_Anomaly_Logon_to_UsWeb\rule.co"
    // 	-c "c:\Work\-=SIEM=-\Content\knowledgebase\packages\esc_profiling\correlation_rules\devops\ESC_Anomaly_Logon_to_UsWeb\tests\test_1.sc"
    // 	--schema "C:\Work\-=SIEM=-\Output\schema.json"
    // 	--fpta-defaults "C:\Work\-=SIEM=-\Output\correlation_defaults.json"
    // 	--rules-filters "C:\Work\-=SIEM=-\Content\knowledgebase\common\rules_filters"

    // Очищаем и показываем окно Output
    const ruleFilePath = test.getRuleFullPath();

    // const ecaTestParam = `C:\\Tools\\0.22.774\\any\\any\\win\\ecatest.exe`;
    const ecaTestParam = this.config.getEcatestFullPath();
    const sdkDirPath = this.config.getSiemSdkDirectoryPath();
    const taxonomyFilePath = this.config.getTaxonomyFullPath();
    const testFilepath = test.getTestExpectationPath();
    const fptDefaults = this.config.getCorrelationDefaultsFilePath(rootFolder);
    const schemaFilePath = this.config.getSchemaFullPath(rootFolder);
    const ruleFiltersDirPath = this.config.getRulesDirFilters();

    const output = await ProcessHelper.execute(
      ecaTestParam,
      [
        '--sdk',
        sdkDirPath,
        '--taxonomy',
        taxonomyFilePath,
        '--temp',
        tmpDirPath,
        '-s',
        ruleFilePath,
        '-c',
        testFilepath,
        '--schema',
        schemaFilePath,
        '--fpta-defaults',
        fptDefaults,
        '--rules-filters',
        ruleFiltersDirPath
      ],
      {
        encoding: 'utf-8',
        outputChannel: this.config.getOutputChannel()
      }
    );

    if (!output.output) {
      DialogHelper.showError(
        'Не удалось запустить модульные тесты, команда запуска не вернула ожидаемые данные. Проверьте путь до утилит KBT [в настройках расширения](command:workbench.action.openSettings?["xpConfig.kbtBaseDirectory"]).'
      );
      test.setStatus(TestStatus.Unknown);
      return test;
    }

    // Заполняем вывод как есть. Далее он будет обновлен в зависимости от ситуации.
    test.setOutput(output.output);

    // Получаем путь к правилу для которого запускали тест
    const ruleFileUri = vscode.Uri.file(ruleFilePath);

    // Если ничего не ожидали (expect not) и ничего не получили, то все хорошо.
    if (output.output.includes(this.EMPTY_EXPECTED_RESULT)) {
      test.setStatus(TestStatus.Success);
      return test;
    }

    if (output.output.includes(this.SUCCESS_TEST_SUBSTRING)) {
      // Обновление статуса теста.
      test.setStatus(TestStatus.Success);

      // TODO: кажется, лишний метод. Разобраться.
      // const expectedResult = this._outputParser.parseSuccessOutput(output.output);

      // Вывод теста содержит событие, подходящее под expect секцию, поэтому извлекаем его и очищаем, как код теста.
      const jsons = RegExpHelper.parseJsonsFromMultilineString(output.output);
      if (jsons.length != 1) {
        throw new XpException('The actual event could not be parsed');
      }

      const clearedResult = TestHelper.cleanModularTestResult(jsons[0]);

      // Так как тест успешный, то можно сохранить отформатированный результат.
      test.setOutput(clearedResult);

      // Сохраняем фактическое события для последующего обновления ожидаемого.
      test.setActualEvent(clearedResult);

      // Добавляем отформатированный результат в окно вывода.
      Log.debug('\n\nFormatted result:\n' + clearedResult);

      // Очищаем ранее выявленные ошибки, если такие были.
      this.config.getDiagnosticCollection().set(ruleFileUri, []);
      return test;
    }

    test.setStatus(TestStatus.Failed);
    const expectation = test.getTestExpectation();
    const failedOutput = this._outputParser.parseFailedOutput(output.output, expectation);
    test.setOutput(failedOutput);

    // Парсим ошибки из вывода.
    let diagnostics = this._outputParser.parse(output.output);
    if (diagnostics.length === 0) {
      throw new XpException(
        'Ошибка выполнения теста. [Смотри Output](command:xp.commonCommands.showOutputChannel)'
      );
    }

    // Коррекция вывода.
    const ruleContent = await FileSystemHelper.readContentFile(ruleFilePath);
    diagnostics = TestHelper.correctWhitespaceCharacterFromErrorLines(ruleContent, diagnostics);

    // Выводим ошибки в нативной для VsCode форме.
    this.config.getDiagnosticCollection().set(ruleFileUri, diagnostics);

    return test;
  }

  private readonly SUCCESS_TEST_SUBSTRING = 'SUCCESS!';

  private readonly EMPTY_EXPECTED_RESULT = "You wanted nothing and you've got nothing!";
}
