import * as vscode from 'vscode';

import { Configuration } from '../configuration';
import { TestStatus } from './testStatus';
import { BaseUnitTest } from './baseUnitTest';
import { SDKUtilitiesWrappers } from '../../tools/sdkUtilitiesWrappers';
import { diffJson } from 'diff';
import { UnitTestRunner } from './unitTestsRunner';
import { UnitTestOutputParser } from './unitTestOutputParser';
import { XpException } from '../xpException';

export class NormalizationUnitTestsRunner implements UnitTestRunner {

	constructor(private _config: Configuration, private _outputParser : UnitTestOutputParser) {
	}

	public async run(unitTest: BaseUnitTest): Promise<BaseUnitTest> {

		const wrapper = new SDKUtilitiesWrappers(this._config);
		const rule = unitTest.getRule();

		const utilityOutput = await wrapper.testNormalization(unitTest);
		if(utilityOutput) {
			throw new XpException("Нормализатор не вернул никакого события. Исправьте правило нормализации и повторите.");
		}

		// Получаем путь к правилу для которого запускали тест
		const ruleFileUri = vscode.Uri.file(rule.getFilePath());

		// Парсим ошибки из вывода.
		const diagnostics = this._outputParser.parse(utilityOutput);

		// Выводим ошибки в нативной для VsCode форме.
		this._config.getDiagnosticCollection().set(ruleFileUri, diagnostics);			
		
		unitTest.setStatus(TestStatus.Failed);
		if (diagnostics && diagnostics.length > 0){
			unitTest.setOutput(utilityOutput);
			return unitTest;
		}

		const normalizedEventResult = /\{.*\}/is.exec(utilityOutput);
		if(!normalizedEventResult || normalizedEventResult.length != 1) {
			throw new XpException("Нормализатор не вернул никакого события. Исправьте правило нормализации и повторите.");
		}
		const normalizedEvent = normalizedEventResult[0];

		// Проверяем ожидаемого и фактическое событие.
		const expectation = JSON.parse(unitTest.getTestExpectation());
		const actual = JSON.parse(normalizedEvent);

		const difference = diffJson(expectation, actual);
		
		let result_diff = "";
		for (const part of difference) {
			const sign = part.added ? '+' :	(part.removed ? '-' : ' ');
			const lines = part.value.split(/\r?\n/).filter((line)=>{return line != '';});
			for (const line of lines){
				result_diff += sign + line + '\n';
			}
		}
		unitTest.setOutput(result_diff);

		if (difference.length == 1){
			unitTest.setStatus(TestStatus.Success);
		}

		return unitTest;
	}
}
