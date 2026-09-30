import * as assert from 'assert';
import { TestHelper } from '../../helpers/testHelper';

suite('testHelper.cleanSortFormatExpectedEventTestCode', async () => {
  test('Удаление списка сработавших правил обогащения из ожидаемого события', async () => {
    const event = `{"src.ip": "::1", "_applied_enrichment_rules": ["rule_1", "rule_2"], "action": "login"}`;

    const actual = TestHelper.cleanSortFormatExpectedEventTestCode(event);
    assert.deepStrictEqual(JSON.parse(actual), { action: 'login', 'src.ip': '::1' });
  });
});
