import * as vscode from 'vscode';
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as fsExtra from 'fs-extra';

import { Correlation } from '../../../models/content/correlation';
import { TestFixture } from '../../helper';
import { ContentTreeProvider } from '../../../views/contentTree/contentTreeProvider';
import { ModuleTestOutputParser } from '../../../views/modularTestsEditor/modularTestOutputParser';
import { CorrelationUnitTest } from '../../../models/tests/correlationUnitTest';

suite('Корреляции', () => {

	test('Переименование без сохранения на диск', async () => {
		// Копируем корреляцию во временную директорию.
		const oldRuleName = "Active_Directory_Snapshot";
		const correlationTmpPath = TestFixture.getCorrelationPath(oldRuleName);
		const correlation = await Correlation.parseFromDirectory(correlationTmpPath);

		const newRuleName = "Super_Duper_Correlation";
		await correlation.rename(newRuleName);

		const newRuleDirPath = correlation.getDirectoryPath();
		const ruleDirectoryName = path.basename(newRuleDirPath);
		assert.strictEqual(ruleDirectoryName, newRuleName);

		assert.strictEqual(correlation.getName(), newRuleName);

		const metainfo = correlation.getMetaInfo();
		assert.strictEqual(metainfo.getName(), newRuleName);

		const newRuleCode = await correlation.getRuleCode();
		assert.ok(newRuleCode.includes(newRuleName) && !newRuleCode.includes(oldRuleName));

		// Интеграционные тесты.
		const intTests = correlation.getIntegrationTests();
		assert.strictEqual(intTests.length, 2);

		const intTests1 = intTests[0];
		const testCode1 = intTests1.getTestCode();
		assert.ok(!testCode1.includes(oldRuleName));

		const intTests2 = intTests[0];
		const testCode2 = intTests2.getTestCode();
		assert.ok(!testCode2.includes(oldRuleName));

		// Модульные тесты.
		const modTests = correlation.getModularTests();
		assert.strictEqual(modTests.length, 0);
	});

	test('Успешная сработка нажатия на корреляции', async () => {
		const rulePath = TestFixture.getCorrelationPath("Active_Directory_Snapshot");
		const correlation = await Correlation.parseFromDirectory(rulePath);

		const commandResult = await vscode.commands.executeCommand(ContentTreeProvider.onRuleClickCommand, correlation);
		assert.ok(commandResult);
	});
	
	test('Корректное сохранение добавленного модульного теста на диск', async () => {
		const tmpPath = TestFixture.getTmpPath();
		let rule = Correlation.create("SavedOnDiskCorrelation", tmpPath);

		const modTest = new CorrelationUnitTest();
		modTest.setTestCode("test code");
		rule.addModularTests([modTest]);
		await rule.save();

		rule = await Correlation.parseFromDirectory(rule.getDirectoryPath());
		const modularTests = rule.getModularTests();

		assert.ok(modularTests.length == 1);
		assert.strictEqual(modularTests[0].getTestCode(), "test code");
		assert.strictEqual(modularTests[0].getNumber(), 1);
	});

	test('Неудачная попытка создать тест для правила без пути', () => {

		const rule = Correlation.create("ESC_SuperDuperCorrelation");
		assert.throws(() => rule.createIntegrationTest(), Error);
	});

	// Удаляем созданные корреляции.
	setup( () => {
		const tmpPath = TestFixture.getTmpPath();
		if(!fs.existsSync(tmpPath)) {
			fs.mkdirSync(tmpPath);
		}
	});

	// Удаляем созданные корреляции.
	teardown(() => {
		const tmpPath = TestFixture.getTmpPath();
		if(fs.existsSync(tmpPath)) {
			fs.rmdirSync(tmpPath, { recursive: true });
		}
	});
});