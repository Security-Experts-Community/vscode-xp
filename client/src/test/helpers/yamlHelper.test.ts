import * as assert from 'assert';
import * as os from 'os';

import { YamlHelper } from '../../helpers/yamlHelper';

suite('YamlHelper', () => {
  // Параметры сериализации, с которыми расширение настраивает YamlHelper при активации.
  suiteSetup(() => {
    YamlHelper.configure(
      { lineWidth: -1, indent: 4, noArrayIndent: true, quotingType: "'" },
      undefined,
      async (text: string) => text
    );
  });

  const localizationYaml = [
    "Description: 'Описание'",
    'EventDescriptions:',
    "  - LocalizationId: 'corrname_Rule'",
    "    EventDescription: 'Локализация'"
  ].join('\n');

  test('Документы, отличающиеся только форматированием, совпадают', () => {
    const reformattedYaml = [
      'EventDescriptions:',
      '    -   EventDescription: Локализация',
      '        LocalizationId: corrname_Rule',
      'Description: Описание'
    ].join('\n');

    assert.ok(YamlHelper.isSameContent(localizationYaml, reformattedYaml));
  });

  test('Пустые значения приравниваются к отсутствующим', () => {
    assert.ok(
      YamlHelper.isSameContent(
        "Description: 'Описание'\nImprovements: []",
        "Description: 'Описание'"
      )
    );
  });

  test('Документы с разными значениями не совпадают', () => {
    const changedYaml = localizationYaml.replace('Локализация', 'Другая локализация');

    assert.ok(!YamlHelper.isSameContent(localizationYaml, changedYaml));
  });

  test('Игнорируемые поля не участвуют в сравнении', () => {
    const removeUpdated = (object: any) => delete object?.ExpertContext?.Updated;

    assert.ok(
      YamlHelper.isSameContent(
        'ExpertContext:\n  Updated: 07.09.2026',
        'ExpertContext:\n  Updated: 29.09.2026',
        removeUpdated
      )
    );
  });

  test('Сериализация сохраняет отступы текущего файла', async () => {
    const localization = YamlHelper.parse(localizationYaml);

    const actual = await YamlHelper.localizationsStringify(localization, localizationYaml);

    assert.strictEqual(actual.trimEnd(), localizationYaml.split('\n').join(os.EOL));
  });
});
