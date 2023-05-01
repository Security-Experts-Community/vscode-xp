import * as assert from 'assert';
import * as path from 'path';

import { TestFixture } from '../../helper';
import { Normalization } from '../../../models/content/normalization';

suite('Модульный тест нормализации', () => {

	test('Нет базовой директории для тестов', async() => {
		const rulePath = TestFixture.getCorrelationPath("without_tests");
		const rule = await Normalization.parseFromDirectory(rulePath);
		const actualTests = rule.getUnitTests();

		assert.strictEqual(actualTests.length, 0);
	});
	
	test('Проверка пути до теста', async() => {
		const rulePath = TestFixture.getCorrelationPath("without_tests");
		const rule = await Normalization.parseFromDirectory(rulePath);
		const unitTest = rule.createNewUnitTest();

		const expectTestPath = path.join(rulePath, "tests", "norm_1.js");
		const actualTestPath = unitTest.getTestExpectationPath();
		assert.strictEqual(actualTestPath, expectTestPath);
	});

	test('Проверка пути до правила', async() => {
		const rulePath = TestFixture.getCorrelationPath("without_tests");
		const rule = await Normalization.parseFromDirectory(rulePath);
		const unitTest = rule.createNewUnitTest();

		const expectRulePath = path.join(rulePath, 'formula.xp');
		const actualRulePath = unitTest.getRuleFullPath();
		assert.strictEqual(actualRulePath, expectRulePath);
	});
});