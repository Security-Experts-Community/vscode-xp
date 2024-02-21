import * as assert from 'assert';

import { FileSystemHelper } from '../../helpers/fileSystemHelper';

suite('fileSystemHelper', () => {

	test('resolveTildeWindowsUserHomePath', async () => {
		const actualPath = FileSystemHelper.resolveTildeWindowsUserHomePath(
			`C:\\Users\\FEDUK~1\\AppData\\Local\\Temp\\eXtraction and Processing\\865f3867-33e1-5011-f625-22595c4630ef`,
			'fedukova');

		assert.strictEqual(
			actualPath,
			`C:\\Users\\fedukova\\AppData\\Local\\Temp\\eXtraction and Processing\\865f3867-33e1-5011-f625-22595c4630ef`
		);
	});
});