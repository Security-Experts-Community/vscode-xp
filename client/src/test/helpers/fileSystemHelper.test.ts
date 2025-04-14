import * as assert from 'assert';

import { FileSystemHelper } from '../../helpers/fileSystemHelper';

suite('fileSystemHelper.resolveTildeWindowsUserHomePath', () => {
  test('tilde at the end of the username', async () => {
    const actualPath = FileSystemHelper.resolveTildeWindowsUserHomePath(
      `C:\\Users\\FEDUK~1\\AppData\\Local\\Temp\\eXtraction and Processing\\865f3867-33e1-5011-f625-22595c4630ef`,
      'fedukova'
    );

    assert.strictEqual(
      actualPath,
      `C:\\Users\\fedukova\\AppData\\Local\\Temp\\eXtraction and Processing\\865f3867-33e1-5011-f625-22595c4630ef`
    );
  });

  test('tilde inside username', async () => {
    const actualPath = FileSystemHelper.resolveTildeWindowsUserHomePath(
      `C:\\Users\\ROMAN~1.CHE\\AppData\\Local\\Temp\\eXtraction and Processing\\865f3867-33e1-5011-f625-22595c4630ef`,
      'ROMANOS.CHE'
    );

    assert.strictEqual(
      actualPath,
      `C:\\Users\\ROMANOS.CHE\\AppData\\Local\\Temp\\eXtraction and Processing\\865f3867-33e1-5011-f625-22595c4630ef`
    );
  });
});
