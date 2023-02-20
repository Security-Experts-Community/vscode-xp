import * as assert from 'assert';

import { TestFixture } from '../helper';
import { Localization } from '../../models/content/localization';
import { Correlation } from '../../models/content/correlation';

suite('Локализации', () => {
	
	test('Парсинг трех локализаций', () => {
		const loc = Localization.create(
			`correlation_name = "MSSQL_user_password_brute" and src.ip != null and newCriteria`,
			"RuLocalization",
			"EnLocalization"
		)
	});

	test('Парсинг трех локализаций', () => {
		const rulePath = TestFixture.getTestPath("localizations", "MSSQL_user_password_brute");
		const localizations = Localization.parseFromDirectory(rulePath);

		assert.strictEqual(localizations.length, 3);

		const localization1 = localizations[0];
		assert.strictEqual(localization1.getCriteria(), `correlation_name = "MSSQL_user_password_brute" and src.ip != null`);
		assert.strictEqual(localization1.getLocalizationId(), `corrname_MSSQL_user_password_brute_1`);
		assert.strictEqual(localization1.getRuLocalizationText(), `Обнаружена попытка подбора пароля учетной записи '{subject.account.name}' на MSSQL Server '{dst.host}' с узла '{src.host}'. Выполнено {datafield5} попыток. `);
		assert.strictEqual(localization1.getEnLocalizationText(), `Brute force attempt detected for account '{subject.account.name}' on MSSQL Server '{dst.host}' from host '{src.host}'. {datafield5} attempts completed.`);
		assert.strictEqual(localization1.getRuDescription(), `Выявляет попытки подбора пароля на сервере MSSQL Server`);
		assert.strictEqual(localization1.getEnDescription(), `Detects password guessing attempts on MSSQL Server`);


		const localization2 = localizations[1];
		assert.strictEqual(localization2.getCriteria(), `correlation_name = "MSSQL_user_password_brute" and src.ip == null`);
		assert.strictEqual(localization2.getLocalizationId(), `corrname_MSSQL_user_password_brute_2`);
		assert.strictEqual(localization2.getRuLocalizationText(), `Обнаружена попытка подбора пароля учетной записи '{subject.account.name}' на MSSQL Server '{dst.host}' локально. Выполнено {datafield5} попыток. `);
		assert.strictEqual(localization2.getEnLocalizationText(), `Brute force attempt detected for account '{subject.account.name}' on MSSQL Server '{dst.host}' locally. {datafield5} attempts completed.`);
		assert.strictEqual(localization2.getRuDescription(), `Выявляет попытки подбора пароля на сервере MSSQL Server`);
		assert.strictEqual(localization2.getEnDescription(), `Detects password guessing attempts on MSSQL Server`);

		const localization3 = localizations[2];
		assert.strictEqual(localization3.getCriteria(), `correlation_name = "MSSQL_user_password_brute" and subject.account.name == null`);
		assert.strictEqual(localization3.getLocalizationId(), `corrname_MSSQL_user_password_brute_3`);
		assert.strictEqual(localization3.getRuLocalizationText(), `Обнаружена попытка подбора пароля учетной записи на MSSQL Server '{dst.host}' с узла '{src.host}'. Выполнено {datafield5} попыток. `);
		assert.strictEqual(localization3.getEnLocalizationText(), `Brute force attempt detected for account on MSSQL Server '{dst.host}' from host '{src.host}'. {datafield5} attempts completed.`);
		assert.strictEqual(localization3.getRuDescription(), `Выявляет попытки подбора пароля на сервере MSSQL Server`);
		assert.strictEqual(localization3.getEnDescription(), `Detects password guessing attempts on MSSQL Server`);
	});

	test('Добавление новой локализации', async () => {
		const rulePath = TestFixture.getTestPath("localizations", "MSSQL_user_password_brute");
		const correlation = await Correlation.parseFromDirectory(rulePath);

		const newLocalization = 
		Localization.create(
			`correlation_name = "MSSQL_user_password_brute" and src.ip != null and newCriteria`,
			"RuLocalization",
			"EnLocalization");

		const oldLocalizations = correlation.getLocalizations();
		oldLocalizations.push(newLocalization);

		correlation.updateLocalizations(oldLocalizations);

		// Проверяем локализации.
		const actualLocalizations = correlation.getLocalizations();
		assert.strictEqual(actualLocalizations.length, 4);

		// Проверям добавленную локализацию.
		const localization4 = actualLocalizations[3];
		assert.strictEqual(localization4.getLocalizationId(), `corrname_MSSQL_user_password_brute_3`);
		assert.strictEqual(localization4.getCriteria(), `correlation_name = "MSSQL_user_password_brute" and src.ip != null and newCriteria`);
		assert.strictEqual(localization4.getRuLocalizationText(), `RuLocalization`);
		assert.strictEqual(localization4.getEnLocalizationText(), `EnLocalization`);

		// Проверяем метаинформацию.
		const eventDescriptions = correlation.getMetaInfo().getEventDescriptions();
		assert.strictEqual(eventDescriptions.length, 4);

		// Проверям добавленную метаинформацию.
		const eventDescriptions4 = eventDescriptions[3];
		assert.strictEqual(eventDescriptions4.getLocalizationId(), `corrname_MSSQL_user_password_brute_3`);
		assert.strictEqual(eventDescriptions4.getCriteria(), `correlation_name = "MSSQL_user_password_brute" and src.ip != null and newCriteria`);
	});

	test('Задание одной локализации поверх имеющихся', async () => {
		const rulePath = TestFixture.getTestPath("localizations", "MSSQL_user_password_brute");
		const correlation = await Correlation.parseFromDirectory(rulePath);

		const newLocalization = Localization.create(
			`correlation_name = "MSSQL_user_password_brute" and src.ip != null`,
			"RuLocalization",
			"EnLocalization");
			
		correlation.updateLocalizations([newLocalization]);

		const actualLocalizations = correlation.getLocalizations();
		assert.strictEqual(actualLocalizations.length, 1);

		const localization1 = actualLocalizations[0];
		assert.strictEqual(localization1.getLocalizationId(), `corrname_MSSQL_user_password_brute`);
		assert.strictEqual(localization1.getCriteria(), `correlation_name = "MSSQL_user_password_brute" and src.ip != null`);
		assert.strictEqual(localization1.getRuLocalizationText(), `RuLocalization`);
		assert.strictEqual(localization1.getEnLocalizationText(), `EnLocalization`);

		// Проверяем метаинформацию.
		const eventDescriptions = correlation.getMetaInfo().getEventDescriptions();
		assert.strictEqual(eventDescriptions.length, 1);

		// Проверям добавленную метаинформацию.
		const eventDescriptions1 = eventDescriptions[0];
		assert.strictEqual(eventDescriptions1.getLocalizationId(), `corrname_MSSQL_user_password_brute`);
		assert.strictEqual(eventDescriptions1.getCriteria(), `correlation_name = "MSSQL_user_password_brute" and src.ip != null`);
	});

	test('Задание одной локализации c LocalizationId при создании правила с нуля', () => {
		const correlation = Correlation.create("ESC_Super_Duper_Correlation", "super_duper_path");

		const newLocalization = Localization.create(
			`correlation_name = "ESC_Super_Duper_Correlation" and src.ip != null`,
			"RuLocalization",
			"EnLocalization");
		newLocalization.setLocalizationId("corrname_ESC_Super_Duper_Correlation_custom");

		correlation.updateLocalizations([newLocalization]);

		const actualLocalizations = correlation.getLocalizations();
		assert.strictEqual(actualLocalizations.length, 1);

		const localization1 = actualLocalizations[0];
		assert.strictEqual(localization1.getLocalizationId(), `corrname_ESC_Super_Duper_Correlation_custom`);
		assert.strictEqual(localization1.getCriteria(), `correlation_name = "ESC_Super_Duper_Correlation" and src.ip != null`);
		assert.strictEqual(localization1.getRuLocalizationText(), `RuLocalization`);
		assert.strictEqual(localization1.getEnLocalizationText(), `EnLocalization`);

		// Проверяем метаинформацию.
		const eventDescriptions = correlation.getMetaInfo().getEventDescriptions();
		assert.strictEqual(eventDescriptions.length, 1);

		// Проверям добавленную метаинформацию.
		const eventDescriptions1 = eventDescriptions[0];
		assert.strictEqual(eventDescriptions1.getLocalizationId(), `corrname_ESC_Super_Duper_Correlation_custom`);
		assert.strictEqual(eventDescriptions1.getCriteria(), `correlation_name = "ESC_Super_Duper_Correlation" and src.ip != null`);
	});
});