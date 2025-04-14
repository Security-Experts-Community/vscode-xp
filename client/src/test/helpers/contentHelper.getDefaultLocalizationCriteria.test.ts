import * as assert from 'assert';

import { ContentHelper } from '../../helpers/contentHelper';
import { Correlation } from '../../models/content/correlation';
import { Normalization } from '../../models/content/normalization';

suite('TestHelper.getDefaultLocalizationCriteria', async () => {
  test('Критерий по умолчанию для корреляции', async () => {
    const correlationName = 'New_Correlation';
    const correlation = Correlation.create(correlationName);

    const actual = await ContentHelper.getDefaultLocalizationCriteria(correlation);
    assert.strictEqual(actual, `correlation_name = "${correlationName}"`);
  });

  test('Критерий по умолчанию для нормализации с заданным id в коде', async () => {
    const normalizationName = 'New_Normalization';
    const normalization = Normalization.create(normalizationName);
    await normalization.setRuleCode(`id = "Custom_Normalization_Id"`);

    const actual = await ContentHelper.getDefaultLocalizationCriteria(normalization);
    assert.strictEqual(actual, `id = "Custom_Normalization_Id"`);
  });

  test('Критерий по умолчанию для нормализации без заданного id в коде', async () => {
    const normalizationName = 'New_Normalization';
    const normalization = Normalization.create(normalizationName);

    const actual = await ContentHelper.getDefaultLocalizationCriteria(normalization);
    assert.strictEqual(actual, `id = "${normalizationName}"`);
  });
});
