import * as vscode from 'vscode';

import { Configuration } from '../configuration';
import { TestStatus } from './testStatus';
import { BaseUnitTest } from './baseUnitTest';
import { SDKUtilitiesWrappers } from '../../tools/sdkUtilitiesWrappers';
import { diffJson } from 'diff';
import { UnitTestRunner } from './unitTestsRunner';
import { UnitTestOutputParser } from './unitTestOutputParser';

export class NormalizationUnitTestsRunner implements UnitTestRunner {

	constructor(private _config: Configuration, private _outputParser : UnitTestOutputParser) {
	}

	public async run(unitTest: BaseUnitTest): Promise<BaseUnitTest> {

		const wrapper = new SDKUtilitiesWrappers(this._config);
		const rule = unitTest.getRule();

		const utilityOutput = await wrapper.testNormalization(unitTest);

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

		const normalizedEvent = /\{.*\}/is.exec(utilityOutput)[0];

		const difference = diffJson(JSON.parse(unitTest.getTestExpectation()), JSON.parse(normalizedEvent));
		
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
