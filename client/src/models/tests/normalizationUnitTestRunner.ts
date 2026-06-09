import * as vscode from 'vscode';

import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { Configuration } from '../configuration';
import { TestStatus } from './testStatus';
import { BaseUnitTest } from './baseUnitTest';
import { SDKUtilitiesWrappers } from '../../tools/sdkUtilitiesWrappers';
import { diffJson } from 'diff';
import { UnitTestOptions, UnitTestRunner } from './unitTestsRunner';
import { UnitTestOutputParser } from './unitTestOutputParser';
import { XpException } from '../xpException';
import { RegExpHelper } from '../../helpers/regExpHelper';
import { JsHelper } from '../../helpers/jsHelper';

export class NormalizationUnitTestsRunner implements UnitTestRunner {
  constructor(
    private config: Configuration,
    private outputParser: UnitTestOutputParser
  ) {}

  public async run(unitTest: BaseUnitTest, options?: UnitTestOptions): Promise<BaseUnitTest> {
    // Нормализатор не переваривает кириллицу в пути
    // 20 May 2024 - 16:36:53.900 | ERROR | normalize | normalizer-cli returned code 1:
    // Terminated due to exception, what(): Can't cast from NIL to DICTIONARY
    // 20 May 2024 - 16:36:53.900 | ERROR | repo_tools | Must exit due to some critical errors!
    // 20 May 2024 - 16:36:53.900 | INFO | repo_tools | Removing temp directory C:\Users\User\AppData\Local\Temp\eXtractionAndProcessing\tmp\packages\240520163653_h_8qhmn5
    const testsDirPath = unitTest.getTestsDirPath();
    if (!FileSystemHelper.isValidPath(unitTest.getTestsDirPath())) {
      throw new XpException(
        `Путь к тесту '${testsDirPath}' содержит недопустимые символы. Для корректной работы необходимо использовать только латинские буквы, цифры и другие корректные для путей символы, исключая пробелы`
      );
    }

    // Парсим ошибки из вывода.
    const SDKTools = new SDKUtilitiesWrappers(this.config);
    const utilityOutput = await SDKTools.testNormalization(unitTest, {
      useAppendix: options?.useAppendix
    });
    if (!utilityOutput) {
      throw new XpException(
        'Нормализатор не вернул никакого события. Исправьте правило нормализации и повторите'
      );
    }

    unitTest.setOutput(utilityOutput);
    const diagnostics = this.outputParser.parse(utilityOutput);

    // Выводим ошибки в нативной для VsCode форме.
    const rule = unitTest.getRule();
    const ruleFileUri = vscode.Uri.file(rule.getFilePath());
    this.config.getDiagnosticCollection().set(ruleFileUri, diagnostics);

    if (diagnostics && diagnostics.length > 0) {
      return unitTest;
    }

    if (utilityOutput.includes('\nFAIL\n') || utilityOutput.includes('Normalization failed at')) {
      throw new XpException(
        'Нормализация не вернул никакого события. Некорректен код нормализации или входные данные. [Смотри Output](command:xp.commonCommands.showOutputChannel)'
      );
    }

    const normalizedEventResult = RegExpHelper.parseJsonsFromMultilineString(utilityOutput);
    if (!normalizedEventResult || normalizedEventResult.length != 1) {
      throw new XpException(
        'Нормализатор не вернул никакого события. Некорректен код нормализации или входные данные. [Смотри Output](command:xp.commonCommands.showOutputChannel)'
      );
    }
    const actualEvent = normalizedEventResult[0];

    // Проверяем ожидаемое событие
    let expectationObject = {};
    try {
      expectationObject = JSON.parse(unitTest.getTestExpectation());
      if (!JsHelper.isEmptyObj(expectationObject)) {
        expectationObject = this.clearIrrelevantFields(expectationObject);
      }
    } catch (error) {
      throw new XpException(
        'Ожидаемый результат содержит некорректный JSON. Скорректируйте его и повторите',
        error
      );
    }

    let clearActualEventObject = {};
    try {
      const actualEventObject = JSON.parse(actualEvent);
      // Сохраняем фактическое события для последующего обновления ожидаемого.
      const actualEventString = JsHelper.formatJsonObject(actualEventObject);
      unitTest.setActualEvent(actualEventString);

      clearActualEventObject = this.clearIrrelevantFields(actualEventObject);
    } catch (error) {
      throw new XpException(
        'Возвращенное нормализатором событие не является корректным JSON. Проверьте и скорректируйте входное событие после чего повторите',
        error
      );
    }

    // Подсчитываем количество ожидаемых полей, которые существуют и равны фактическим.
    let equalFieldCounter = 0;
    for (const fieldName in expectationObject) {
      if (
        clearActualEventObject[fieldName] &&
        expectationObject[fieldName] === clearActualEventObject[fieldName]
      ) {
        ++equalFieldCounter;
        continue;
      }
      break;
    }

    // Случай, когда тест корректно покрывает часть полей.
    if (equalFieldCounter === Object.keys(expectationObject).length) {
      unitTest.setStatus(TestStatus.Success);
      return unitTest;
    } else {
      unitTest.setStatus(TestStatus.Failed);
    }

    const difference = diffJson(expectationObject, clearActualEventObject);

    // let eventsDiff = "";
    // for (const part of difference) {
    // 	const sign = part.added ? '+' :	(part.removed ? '-' : ' ');
    // 	const lines = part.value.split(/\r?\n/).filter((line)=>{return line != '';});
    // 	for (const line of lines) {
    // 		eventsDiff += sign + line + '\n';
    // 	}
    // }
    // unitTest.setOutput(eventsDiff);

    if (difference.length == 1) {
      unitTest.setStatus(TestStatus.Success);
    } else {
      unitTest.setStatus(TestStatus.Failed);
    }

    return unitTest;
  }

  private clearIrrelevantFields(eventObject: any): any {
    if (eventObject['recv_time']) {
      delete eventObject['recv_time'];
    }

    if (eventObject['time']) {
      delete eventObject['time'];
    }

    // Костыль. Нивелируем appendix.xp
    // event_src.host = coalesce(event_src.fqdn, event_src.hostname, event_src.ip, recv_ipv4, recv_ipv6, recv_host)
    if (
      eventObject['event_src.fqdn'] ||
      eventObject['event_src.hostname'] ||
      eventObject['event_src.ip'] ||
      eventObject['recv_ipv4'] ||
      eventObject['recv_ipv6'] ||
      eventObject['recv_host']
    ) {
      delete eventObject['event_src.host'];
    }

    // src.host = coalesce(src.fqdn, src.hostname, src.ip, src.mac)
    if (
      eventObject['src.fqdn'] ||
      eventObject['src.hostname'] ||
      eventObject['src.ip'] ||
      eventObject['src.mac']
    ) {
      delete eventObject['src.host'];
    }

    // dst.host = coalesce(dst.fqdn, dst.hostname, dst.ip, dst.mac)
    if (
      eventObject['dst.fqdn'] ||
      eventObject['dst.hostname'] ||
      eventObject['dst.ip'] ||
      eventObject['dst.mac']
    ) {
      delete eventObject['dst.host'];
    }

    // external_src.host = coalesce(external_src.fqdn, external_src.hostname, external_src.ip)
    if (
      eventObject['external_src.fqdn'] ||
      eventObject['external_src.hostname'] ||
      eventObject['external_src.ip']
    ) {
      delete eventObject['external_src.host'];
    }

    // external_dst.host = coalesce(external_dst.fqdn, external_dst.hostname, external_dst.ip)
    if (
      eventObject['external_dst.fqdn'] ||
      eventObject['external_dst.hostname'] ||
      eventObject['external_dst.ip']
    ) {
      delete eventObject['external_dst.host'];
    }

    // if importance == null then
    // 		importance = "info"
    // endif
    if (!eventObject['importance']) {
      eventObject['importance'] = 'info';
    }

    // if(eventObject['event_src.host']) {
    // 	delete eventObject['event_src.host'];
    // }

    return eventObject;
  }
}
