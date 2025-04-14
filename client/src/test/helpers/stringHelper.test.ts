import * as assert from 'assert';

import { StringHelper } from '../../helpers/stringHelper';

suite('StringHelper', () => {
  test('Удаление неразрывного проблема ', () => {
    const actual = StringHelper.replaceIrregularSymbols(`test string\u00a0with no no-break space`);

    assert.strictEqual(actual, `test string with no no-break space`);
  });

  test('Сохранение новой строки \\n с присутствием \\n', () => {
    const actual = StringHelper.escapeSpecialChars(
      `session_server_principal_name:rf\\Administrator
server_principal_name:\\nrf\\Administrator`
    );

    const expected =
      'session_server_principal_name:rf\\Administrator\\nserver_principal_name:\\nrf\\Administrator';
    assert.strictEqual(actual, expected);
  });

  test('Сохранение новой строки \\n без присутствия \\n', () => {
    const actual = StringHelper.escapeSpecialChars(
      `session_server_principal_name:rf\\Administrator
server_principal_name:rf\\Administrator`
    );

    const expected =
      'session_server_principal_name:rf\\Administrator\\nserver_principal_name:rf\\Administrator';
    assert.strictEqual(actual, expected);
  });

  test('Исключение новой строки \\n', () => {
    const actual = StringHelper.textToOneLine(
      'Обнаружена попытка пользователя {subject.account.name} \n({subject.account.domain}) повысить привилегии с использованием уязвимости сервиса печати Print Spooler (CVE-2022-30206) с помощью утилиты {object.process.name} на узле {event_src.host}'
    );
    const expected =
      'Обнаружена попытка пользователя {subject.account.name} ({subject.account.domain}) повысить привилегии с использованием уязвимости сервиса печати Print Spooler (CVE-2022-30206) с помощью утилиты {object.process.name} на узле {event_src.host}';

    assert.strictEqual(actual, expected);
  });

  test('Исключение новой строки \\r\\n', () => {
    const actual = StringHelper.textToOneLine(
      'Обнаружена попытка пользователя {subject.account.name} \r\n({subject.account.domain}) повысить привилегии с использованием уязвимости сервиса печати Print Spooler (CVE-2022-30206) с помощью утилиты {object.process.name} на узле {event_src.host}'
    );
    const expected =
      'Обнаружена попытка пользователя {subject.account.name} ({subject.account.domain}) повысить привилегии с использованием уязвимости сервиса печати Print Spooler (CVE-2022-30206) с помощью утилиты {object.process.name} на узле {event_src.host}';

    assert.strictEqual(actual, expected);
  });

  test('Исключение новой строки \\n и пробелов с начала строки', () => {
    const actual = StringHelper.textToOneLineAndTrim(
      '   Обнаружена попытка пользователя {subject.account.name} \n({subject.account.domain}) повысить привилегии с использованием уязвимости сервиса печати Print Spooler (CVE-2022-30206) с помощью утилиты {object.process.name} на узле {event_src.host}'
    );
    const expected =
      'Обнаружена попытка пользователя {subject.account.name} ({subject.account.domain}) повысить привилегии с использованием уязвимости сервиса печати Print Spooler (CVE-2022-30206) с помощью утилиты {object.process.name} на узле {event_src.host}';

    assert.strictEqual(actual, expected);
  });
});
