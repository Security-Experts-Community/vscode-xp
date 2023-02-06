import * as vscode from 'vscode';
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

import { TestFixture } from '../../helper';
import { CorrelationUnitTest } from '../../../models/tests/correlationUnitTest';
import { Correlation } from '../../../models/content/correlation';

suite('Модульный тест', () => {

	test('Нет базовой директории для тестов', async() => {
		const rulePath = TestFixture.getCorrelationPath("without_tests");
		const rule = await Correlation.parseFromDirectory(rulePath);
		const actualTests = CorrelationUnitTest.parseFromRuleDirectory(rulePath, rule);

		assert.strictEqual(actualTests.length, 0);
	});
	
	test('Проверка пути до теста', async() => {
		const tmpDirectory = TestFixture.getTmpPath();
		const rulePath = TestFixture.getCorrelationPath("without_tests");
		const rule = await Correlation.parseFromDirectory(rulePath);
		const unitTest = CorrelationUnitTest.create(tmpDirectory, rule);

		const expectTestPath = path.join(tmpDirectory, "tests", "test_1.sc");
		const actualTestPath = unitTest.getTestPath();
		assert.strictEqual(actualTestPath, expectTestPath);
	});

	test('Проверка пути до правила', async() => {
		const tmpDirectory = TestFixture.getTmpPath();
		const rulePath = TestFixture.getCorrelationPath("without_tests");
		const rule = await Correlation.parseFromDirectory(rulePath);
		const unitTest = CorrelationUnitTest.create(tmpDirectory, rule);

		const expectRulePath = path.join(tmpDirectory, 'rule.co');
		const actualRulePath = unitTest.getRuleFullPath();
		assert.strictEqual(actualRulePath, expectRulePath);
	});
});