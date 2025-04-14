import * as assert from 'assert';
import { KbHelper } from '../../helpers/kbHelper';

suite('KbHelper', async () => {
  test('Два события скопированные через Ctrl+C из SIEM', async () => {
    const actual = KbHelper.convertWindowsEOFToLinux(`Тут встречается новая строка \r\n`);
    assert.strictEqual(actual, 'Тут встречается новая строка \n');
  });

  test('Проверяем коллизию для различных имен правил', async () => {
    const firstObjectId = KbHelper.generateObjectId('ESC_Sessions_Hijacked', 'LOC', 'CR');
    const secondObjectId = KbHelper.generateObjectId('OpenVPN_Password_Spraying', 'LOC', 'CR');
    assert.ok(firstObjectId != secondObjectId);
  });
});
