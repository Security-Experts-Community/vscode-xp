import * as vscode from 'vscode';
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

import { TestFixture } from '../../helper';
import { CorrelationUnitTest } from '../../../models/tests/correlationUnitTest';
import { Correlation } from '../../../models/content/correlation';
import { FileSystemHelper } from '../../../helpers/fileSystemHelper';

suite('Модульный тест корреляции', () => {

	test('Нет базовой директории для тестов', async() => {
		const rulePath = TestFixture.getCorrelationPath("without_tests");
		const rule = await Correlation.parseFromDirectory(rulePath);
		const actualTests = rule.getUnitTests();

		assert.strictEqual(actualTests.length, 0);
	});
	
	test('Проверка пути до теста', async() => {
		const rulePath = TestFixture.getCorrelationPath("without_tests");
		const rule = await Correlation.parseFromDirectory(rulePath);
		const unitTest = rule.createNewUnitTest();

		const expectTestPath = path.join(rulePath, "tests", "test_1.sc");
		const actualTestPath = unitTest.getTestExpectationPath();
		assert.strictEqual(actualTestPath, expectTestPath);
	});

	test('Проверка пути до правила', async() => {
		const rulePath = TestFixture.getCorrelationPath("without_tests");
		const rule = await Correlation.parseFromDirectory(rulePath);
		const unitTest = rule.createNewUnitTest();

		const expectRulePath = path.join(rulePath, 'rule.co');
		const actualRulePath = unitTest.getRuleFullPath();
		assert.strictEqual(actualRulePath, expectRulePath);
	});

	test('Проверка парсинга модульного теста', async() => {
		
		const rulePath = TestFixture.getCorrelationPath("with_unit_test");
		// const srcPath = path.join(rulePath, "tests", "test_1.bak");
		// const dstPath = path.join(rulePath, "tests", "test_1.sc");
		// fs.copyFile(srcPath, dstPath, (error) => {console.log(error.message);});
		const rule = await Correlation.parseFromDirectory(rulePath);
		
		const unitTests = rule.getUnitTests();
		assert.strictEqual(unitTests.length, 1);

		const unitTest = unitTests[0];

		const expectedInputData = `# Comment input 1\n# Comment input2\n# Тут будет твой тест.
{"msgid":"4624","normalized":true,"object":"system","object.property":"session","object.value":"0","recv_ipv4":"127.0.0.1"}`;
		const actualInputData = unitTest.getTestInputData();
		assert.strictEqual(actualInputData, expectedInputData);

		const expectedCondition = `# Comment 1\n# Comment 2\n# Comment 3
table_list default
table_list {"tl_name":[{"rule":"modified_test","specific_value": "pushkin|172.16.222.132"}]}
expect 1 {"correlation_name":"with_unit_test","subject.account.name":"username"}`;
		const actualCondition = unitTest.getTestExpectation();
		assert.strictEqual(actualCondition, expectedCondition);
	});

	test('Проверка пересборки содержания модульного теста', async() => {
		const rulePath = TestFixture.getCorrelationPath("with_unit_test");
		const templateRule = await Correlation.parseFromDirectory(rulePath);
		const rule = await templateRule.duplicate("modified_test", TestFixture.getTmpPath());
		await rule.save();
		
		const unitTests = rule.getUnitTests();
		assert.strictEqual(unitTests.length, 1);

		const unitTest = unitTests[0];

		await unitTest.save();

		const filePath = path.join(rule.getTestsPath(), "test_1.sc");
		const actualTestContent = await FileSystemHelper.readContentFile(filePath);

		const expectedTestContent = `# Comment 1\n# Comment 2\n# Comment 3
table_list default
table_list {"tl_name":[{"rule":"modified_test","specific_value": "pushkin|172.16.222.132"}]}
expect 1 {"correlation_name":"with_unit_test","subject.account.name":"username"}

# Comment input 1\n# Comment input2\n# Тут будет твой тест.
{"msgid":"4624","normalized":true,"object":"system","object.property":"session","object.value":"0","recv_ipv4":"127.0.0.1"}`;
		assert.strictEqual(actualTestContent, expectedTestContent);
	});
	
});