import * as vscode from 'vscode';
import * as assert from 'assert';
import * as fs from 'fs';

import { TestFixture } from '../../helper';
import { Table } from '../../../models/content/table';
import { StringHelper } from '../../../helpers/stringHelper';

suite('StringHelper', () => {

	test('Исключение новой строки \\n', () => {
		const actual = StringHelper.textToOneLine("Обнаружена попытка пользователя {subject.account.name} \n({subject.account.domain}) повысить привилегии с использованием уязвимости сервиса печати Print Spooler (CVE-2022-30206) с помощью утилиты {object.process.name} на узле {event_src.host}");
		const expected = "Обнаружена попытка пользователя {subject.account.name} ({subject.account.domain}) повысить привилегии с использованием уязвимости сервиса печати Print Spooler (CVE-2022-30206) с помощью утилиты {object.process.name} на узле {event_src.host}"
		
		assert.strictEqual(actual, expected);
	});

	test('Исключение новой строки \\r\\n', () => {
		const actual = StringHelper.textToOneLine("Обнаружена попытка пользователя {subject.account.name} \r\n({subject.account.domain}) повысить привилегии с использованием уязвимости сервиса печати Print Spooler (CVE-2022-30206) с помощью утилиты {object.process.name} на узле {event_src.host}");
		const expected = "Обнаружена попытка пользователя {subject.account.name} ({subject.account.domain}) повысить привилегии с использованием уязвимости сервиса печати Print Spooler (CVE-2022-30206) с помощью утилиты {object.process.name} на узле {event_src.host}"
		
		assert.strictEqual(actual, expected);
	});

	test('Исключение новой строки \\n и пробелов с начала строки', () => {
		const actual = StringHelper.textToOneLineAndTrim("   Обнаружена попытка пользователя {subject.account.name} \n({subject.account.domain}) повысить привилегии с использованием уязвимости сервиса печати Print Spooler (CVE-2022-30206) с помощью утилиты {object.process.name} на узле {event_src.host}");
		const expected = "Обнаружена попытка пользователя {subject.account.name} ({subject.account.domain}) повысить привилегии с использованием уязвимости сервиса печати Print Spooler (CVE-2022-30206) с помощью утилиты {object.process.name} на узле {event_src.host}"
		
		assert.strictEqual(actual, expected);
	});
});