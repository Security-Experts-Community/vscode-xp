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

export class CorrelationUnitTestsRunnerViaEvtTests implements UnitTestRunner {
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

    // evt-tests run correlate <path_to_rule_file>
    // -c <path_to_test_scenario_file>
    // -t <path_to_taxonomy_file>
    // --schema <path_to_tables_schema_file>
    // -f <path_to_fpta_defaults_files>
    // -r <path_to_rules_filters_dir>

    // Очищаем и показываем окно Output
    const ruleFilePath = test.getRuleFullPath();
    const evt_tests = this.config.getEvtTestsFullPath();
    const taxonomyFilePath = this.config.getTaxonomyFullPath();
    const testFilepath = test.getTestExpectationPath();
    const fptDefaults = this.config.getCorrelationDefaultsFilePath(rootFolder);
    const schemaFilePath = this.config.getSchemaFullPath(rootFolder);
    const ruleFiltersDirPath = this.config.getRulesDirFilters();

    const output = await ProcessHelper.execute(
      evt_tests,
      [
        'run',
        'correlate',
        ruleFilePath,
        '-c',
        testFilepath,
        '-t',
        taxonomyFilePath,
        '--schema',
        schemaFilePath,
        '-f',
        fptDefaults,
        '-r',
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

    if (output.output.includes(this.SUCCESS_TEST_SUBSTRING)) {
      // Обновление статуса теста.
      test.setStatus(TestStatus.Success);

      // TODO: кажется, лишний метод. Разобраться.
      // const expectedResult = this._outputParser.parseSuccessOutput(output.output);

      // Вывод теста содержит событие, подходящее под expect секцию, поэтому извлекаем его и очищаем, как код теста.
      const jsons = RegExpHelper.parseJsonsFromMultilineString(output.output);
      if (jsons.length != 1) {
        if (test.getTestExpectation().includes('expect not')) {
          test.setOutput('Noting correlated as expected! Test Success!');
        } else {
          throw new XpException('The actual event could not be parsed');
        }

        return test;
      }

      const clearedResult = TestHelper.cleanModularTestResult(jsons[0]);

      // Так как тест успешный, то можно сохранить отформатированный результат.
      test.setOutput(clearedResult);

      // Сохраняем фактическое события для последующего обновления ожидаемого.
      test.setActualEvent(clearedResult);

      // Очищаем ранее выявленные ошибки, если такие были.
      this.config.getDiagnosticCollection().set(ruleFileUri, []);
      return test;
    }

    test.setStatus(TestStatus.Failed);
    const failedOutput = /Different:\s+(\s+[\w.]+: ".*?" => ".*?"\s|\s+[\w.]+: \d+ => \d+\s)+/.exec(
      output.output
    );

    if (failedOutput && failedOutput.length != 0) {
      test.setOutput(failedOutput[0]);
      const actualEvent = RegExpHelper.parseJsonsFromMultilineStringSIEMJ2(output.output);
      if (actualEvent) {
        const clearedActualEvent = TestHelper.cleanModularTestResult(actualEvent);
        test.setActualEvent(clearedActualEvent);
        vscode.window.showErrorMessage(`Test failed!\n ${failedOutput[0]} `);
      }
    } else {
      test.setActualEvent('');
      vscode.window.showErrorMessage(`Test failed! Probably have no emmits with this events!`);
    }

    // Парсим ошибки из вывода.
    let diagnostics = this._outputParser.parse(output.output);
    if (diagnostics.length !== 0) {
      // throw new XpException(
      //   'Ошибка выполнения теста. [Смотри Output](command:xp.commonCommands.showOutputChannel)'
      // );

      // Коррекция вывода.
      const ruleContent = await FileSystemHelper.readContentFile(ruleFilePath);
      diagnostics = TestHelper.correctWhitespaceCharacterFromErrorLines(ruleContent, diagnostics);

      // Выводим ошибки в нативной для VsCode форме.
      this.config.getDiagnosticCollection().set(ruleFileUri, diagnostics);
    }
    return test;
  }

  private readonly SUCCESS_TEST_SUBSTRING = 'Test success';
}
