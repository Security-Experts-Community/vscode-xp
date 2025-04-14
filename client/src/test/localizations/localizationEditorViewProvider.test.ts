import * as assert from 'assert';
import * as fs from 'fs';

import { TestFixture } from '../helper';
import { Localization } from '../../models/content/localization';
import { Correlation } from '../../models/content/correlation';
import { Configuration } from '../../models/configuration';
import { ContentHelper } from '../../helpers/contentHelper';
import { LocalizationEditorViewProvider } from '../../views/localization/localizationEditorViewProvider';

suite('LocalizationEditorViewProvider', () => {
  test('Допустимо отсутствие английской локализации', async () => {
    const rule = Correlation.create('Correlation');
    const localization = Localization.create(
      `correlation_name = "Correlation" and src.ip != null and newCriteria`,
      'RuLocalization',
      ''
    );
    rule.addLocalization(localization);

    getLocalizationEditorViewProvider().showLocalizationEditor(rule);
  });

  test('Допустимо отсутствие русской локализации', async () => {
    const rule = Correlation.create('Correlation');
    const localization = Localization.create(
      `correlation_name = "Correlation" and src.ip != null and newCriteria`,
      '',
      'EnLocalization'
    );
    rule.addLocalization(localization);

    getLocalizationEditorViewProvider().showLocalizationEditor(rule);
  });

  test('Редактор локализаций не упал при открытии', async () => {
    const rulePath = TestFixture.getCorrelationPath('Active_Directory_Snapshot');
    const rule = await Correlation.parseFromDirectory(rulePath);

    getLocalizationEditorViewProvider().showLocalizationEditor(rule);
  });

  test('Сохранение одной добавленой локализации к корреляции', async () => {
    // Создание корреляции из шаблона и ее сохранение.
    const rule = await ContentHelper.createCorrelationFromTemplate(
      'ESC_Super_Duper',
      'Windows_Universal',
      Configuration.get()
    );

    const tmpPath = TestFixture.getTmpPath();
    rule.save(tmpPath);

    // Открытие формы редактирования.
    const localizationEditor = getLocalizationEditorViewProvider();
    localizationEditor.showLocalizationEditor(rule);

    // Сохранения корреляции.
    const message = {
      command: 'saveLocalizations',
      localizations: {
        RuDescription: 'Описание на русском языке',
        EnDescription: 'The author forgot to set the description of the correlation',
        Criteria: [
          `correlation_name = "ESC_Super_Duper"`,
          `correlation_name = "ESC_Super_Duper" and status='failed'"`
        ],

        RuLocalizations: ['Автор забыл задать локализацию', 'Автор забыл задать локализацию2'],
        EnLocalizations: [
          'The author forgot to set the localization',
          'The author forgot to set the localization2'
        ],
        LocalizationIds: ['corrname_ESC_Super_Duper', '']
      }
    };

    localizationEditor.receiveMessageFromWebView(message);

    const localizations = rule.getLocalizations();
    assert.strictEqual(localizations.length, 2);
  });

  // Создаем временную директорию.
  setup(() => {
    const tmpPath = TestFixture.getTmpPath();
    if (!fs.existsSync(tmpPath)) {
      fs.mkdirSync(tmpPath);
    }
  });

  // Удаляем созданные корреляции.
  teardown(() => {
    const tmpPath = TestFixture.getTmpPath();
    if (fs.existsSync(tmpPath)) {
      fs.rmdirSync(tmpPath, { recursive: true });
    }
  });
});

function getLocalizationEditorViewProvider(): LocalizationEditorViewProvider {
  const config = Configuration.get();
  const localizationTemplatePath = TestFixture.getExtensionFilePath(
    'client',
    'templates',
    'IntegrationTestEditor.html'
  );
  const localizationEditor = new LocalizationEditorViewProvider(config, localizationTemplatePath);

  return localizationEditor;
}
