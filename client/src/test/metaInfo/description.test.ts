import * as assert from 'assert';

import { Correlation } from '../../models/content/correlation';

suite('Описание правила', () => {
  test('Правило без локализации', async () => {
    const rule = Correlation.create('New_Correlation');

    const localeDescription = rule.getLocaleDescription();
    assert.strictEqual(localeDescription, 'New_Correlation');
  });

  test('Правило с русской локализацией', async () => {
    const rule = Correlation.create('New_Correlation');
    rule.getMetaInfo().setRuDescription('Russian localization');

    const localeDescription = rule.getLocaleDescription();
    assert.ok(
      localeDescription == 'New_Correlation' || localeDescription == 'Russian localization'
    );
  });

  test('Правило с английской локализацией', async () => {
    const rule = Correlation.create('New_Correlation');
    rule.getMetaInfo().setEnDescription('English localization');

    const localeDescription = rule.getLocaleDescription();
    assert.ok(
      localeDescription == 'New_Correlation' || localeDescription == 'English localization'
    );
  });
});
