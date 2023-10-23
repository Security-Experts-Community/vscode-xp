import * as assert from 'assert';

import { TestHelper } from '../../helpers/testHelper';

suite('TestHelper.isDefaultLocalization', async () => {

	test('Локализация по умолчанию', async () => {
		const compressedTestCode = `account start process success на узле wks01.testlab.esc`;
		const result = TestHelper.isDefaultLocalization(compressedTestCode);
		assert.ok(result);
	});

	test('Локализация', async () => {
		const compressedTestCode = `Пользователь pupkin запустил подозрительный процесс mimikatz на узле wks01.testlab.esc`;
		const result = TestHelper.isDefaultLocalization(compressedTestCode);
		assert.ok(!result);
	});
});