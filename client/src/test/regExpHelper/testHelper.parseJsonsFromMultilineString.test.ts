import * as assert from 'assert';

import { RegExpHelper } from '../../helpers/regExpHelper';

suite('regExpHelper.parseJsonsFromMultilineString', async () => {
  test('Одностроковый json', async () => {
    const json =
      `{"object.value": "/sources/identify.php,POST,[{value : user_not_exists, text:}]<...>",\r\n` +
      `"object.vendor": "Windows"}`;

    const jsons = RegExpHelper.parseJsonsFromMultilineString(json);

    assert.strictEqual(jsons.length, 1);
    assert.strictEqual(
      jsons[0],
      `{"object.value": "/sources/identify.php,POST,[{value : user_not_exists, text:}]<...>",\r\n"object.vendor": "Windows"}`
    );
  });

  test('Одностроковый json', async () => {
    const json = `{"object.value": "name,objectClass,objectGUID", "src.host": "::1", "src.ip": "::1", "src.port": 1198}`;

    const jsons = RegExpHelper.parseJsonsFromMultilineString(json);

    assert.strictEqual(jsons.length, 1);
    assert.strictEqual(jsons[0], json);
  });

  test('Одностроковый json', async () => {
    const json = `"Detected MIME type application/json from formula
{    
    "action": "login",
    "category.generic": "Application"
}
[INFO] Creating temp directory C:\\Users\\username\\AppData\\Local\\Temp\\eXtraction and Processing\\packages
[INFO] Found desired directory: c:\\Content\\knowledgebase
[INFO] Found appendix, will use it: c:\\Content\\knowledgebase\\contracts\\xp_appendix\\appendix.xp
"`;

    const expectedJson = `{    
    "action": "login",
    "category.generic": "Application"
}`;

    const jsons = RegExpHelper.parseJsonsFromMultilineString(json);

    assert.strictEqual(jsons.length, 1);
    assert.strictEqual(jsons[0], expectedJson);
  });
});
