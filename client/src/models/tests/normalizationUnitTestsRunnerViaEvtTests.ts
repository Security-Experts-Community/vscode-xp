import { Log } from '../../extension';
import { XpException } from '../xpException';
import { BaseUnitTest } from './baseUnitTest';
import { NormalizationUnitTest } from './normalizationUnitTest';
import { NormalizationUnitTestsRunner } from './normalizationUnitTestRunner';
import { UnitTestOptions } from './unitTestsRunner';

export class NormalizationUnitTestsRunnerViaEvtTests extends NormalizationUnitTestsRunner {
  protected async getNormalizerOutput(
    unitTest: BaseUnitTest,
    options?: UnitTestOptions
  ): Promise<string> {
    const normalizationTest = unitTest as NormalizationUnitTest;
    const rule = normalizationTest.getRule();
    Log.info(
      `Запуск теста №${normalizationTest.getNumber()} формулы нормализации '${rule.getName()}' через evt-tests`
    );

    // evt-tests run normalize <formula>
    //   -t <taxonomy>
    //   -e <event>
    //   [-x <appendix>]

    const evtTestsPath = this.config.getEvtTestsFullPath();
    const formulaPath = rule.getFilePath();
    const taxonomyPath = this.config.getTaxonomyFullPath();
    const rawEventPath = normalizationTest.getTestInputDataPath();

    process.env.PTSIEM_SDK_ROOT = this.config.getSiemSdkDirectoryPath();

    let params = [
      'run',
      'normalize',
      formulaPath,
      '-t',
      taxonomyPath,
      '-e',
      rawEventPath
    ];

    if (options?.useAppendix) {
      params = params.concat(['-x', this.config.getAppendixFullPath()]);
    }

    const executeResult = await this.config.getToolRunner().runTool(evtTestsPath, params, {
      encoding: 'utf-8',
      outputChannel: this.config.getOutputChannel()
    });

    if (!executeResult.output) {
      throw new XpException(`evt-tests вернул пустую строку`);
    }

    Log.debug(`Нормализация тестового события завершена c кодом ${executeResult.exitCode}`);
    if (executeResult.exitCode !== 0) {
      Log.error(`Нормализация тестового события завершена c кодом ${executeResult.exitCode}`);
    }

    return executeResult.output;
  }
}
