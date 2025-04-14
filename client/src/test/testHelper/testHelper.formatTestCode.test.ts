import * as assert from 'assert';
import * as os from 'os';

import { TestHelper } from '../../helpers/testHelper';

suite('TestHelper.formatTestCode', async () => {
  test('Форматирование событий с долларом в коде', async () => {
    const formatted = `table_list {"Common_whitelist_auto":[{"rule":"RuleName","specific_value":"$payload = 'fc4883e4f0e8c0000000415141505251564831d265488b5260488b5218488b5220488b7250480fb74a4a4d31c94831c0ac3c617c022c2041c1c90d4101c1e2ed524151488b52208b423c4801d08b80880000004885c074674801d0508b4818448b40204901d0e35648ffc9418b34884801d64d31c94831c0ac41c1c90d4101c138e075f14c034c24084539d175d858448b40244901d066418b0c48448b401c4901d0418b04884801d0415841585e595a41584159415a4883ec204152ffe05841595a488b12e957ffffff5d48ba0100000000000000488d8d0101000041ba318b6f87ffd5bbf0b5a25641baa695bd9dffd54883c4283c067c0a80fbe07505bb4713726f6a00594189daffd563616c632e65786500'$hashbytearray = [byte[]] ($payload -replace '..', '0x$&,' -split ',' -ne '')write-eventlog -logname 'key management service' -source kmsrequests -entrytype information -eventid 31337 -category 0 -message 'here be dragons' -rawdata $hashbytearray"}]}`;
    const actual = TestHelper.formatTestCodeAndEvents(formatted);

    const expected = `table_list {
    "Common_whitelist_auto": [
        {
            "rule": "RuleName",
            "specific_value": "$payload = 'fc4883e4f0e8c0000000415141505251564831d265488b5260488b5218488b5220488b7250480fb74a4a4d31c94831c0ac3c617c022c2041c1c90d4101c1e2ed524151488b52208b423c4801d08b80880000004885c074674801d0508b4818448b40204901d0e35648ffc9418b34884801d64d31c94831c0ac41c1c90d4101c138e075f14c034c24084539d175d858448b40244901d066418b0c48448b401c4901d0418b04884801d0415841585e595a41584159415a4883ec204152ffe05841595a488b12e957ffffff5d48ba0100000000000000488d8d0101000041ba318b6f87ffd5bbf0b5a25641baa695bd9dffd54883c4283c067c0a80fbe07505bb4713726f6a00594189daffd563616c632e65786500'$hashbytearray = [byte[]] ($payload -replace '..', '0x$&,' -split ',' -ne '')write-eventlog -logname 'key management service' -source kmsrequests -entrytype information -eventid 31337 -category 0 -message 'here be dragons' -rawdata $hashbytearray"
        }
    ]
}`;
    assert.strictEqual(actual, expected);
  });

  test('Табуляция после события', async () => {
    const formatted =
      'expect 1 {"correlation_name": null, "object.process.cmdline": "c:\\\\windows\\\\whoami.exe"}\t';

    const compressed = `expect 1 {
    "correlation_name": null,
    "object.process.cmdline": "c:\\\\windows\\\\whoami.exe"
}\t`;

    const actual = TestHelper.formatTestCodeAndEvents(formatted);
    assert.strictEqual(actual, compressed);
  });

  test('Корректная обработка localhost ipv6', async () => {
    const compressedTestCode = `{"object.value": "name,objectClass,objectGUID", "src.host": "::1", "src.ip": "::1", "src.port": 1198}`;

    const formatedTestCode = TestHelper.formatTestCodeAndEvents(compressedTestCode);
    const lines = formatedTestCode.split('\n');

    assert.strictEqual(lines.length, 6);
  });

  test('Неизменность одного текстого события при форматировании', async () => {
    const textEvent = `2022-07-20 07:03:38 W3SVC2 mail-srv 10.0.2.216 POST /Microsoft-Server-ActiveSync/Proxy/default.eas User=user@domain.com&DeviceId=00000000000000000000000001&DeviceType=iPhone&Cmd=Ping&Log=SC1:1_PrxFrom:10.20.52.208_Ver1:161_HH:mail.domain.com_SmtpAdrs:user%40domain.com_Hb:600_Rto:2_Cpo:656_Fet:600000_Mbx:mail-srv.domain.ru_Cafe:DC2-MBX-03.domain.RU_Dc:dc-srv.domain.ru_Throttle:0_SBkOffD:L%2f-470_TmRcv:06:53:38.4480003_TmSt:06:53:38.4519947_TmFin:06:53:38.4519947_TmCmpl:07:03:38.440522_TmCnt:07:03:37.7834641_Budget:(A)Owner%3aS-1-5-21-1023191730-727829927-3110000192-14176%5F00000000000000000000000001%5FiPhone%2cConn%3a0%2cMaxConn%3a10%2cMaxBurst%3a480000%2cBalance%3a480000%2cCutoff%3a600000%2cRechargeRate%3a1800000%2cPolicy%3aGlobalThrottlingPolicy%5F5c9d3d31-7f05-4e14-b8f8-05780608b52f%2cIsServiceAccount%3aFalse%2cLiveTime%3a00%3a00%3a30.6952647%3b(D)Owner%3aS-1-5-21-1023191730-727829927-3110000192-14176%5F00000000000000000000000001%5FiPhone%2cConn%3a0%2cMaxConn%3a10%2cMaxBurst%3a480000%2cBalance%3a480000%2cCutoff%3a600000%2cRechargeRate%3a1800000%2cPolicy%3aGlobalThrottlingPolicy%5F5c9d3d31-7f05-4e14-b8f8-05780608b52f%2cIsServiceAccount%3aFalse%2cLiveTime%3a00%3a00%3a00.6580618_ActivityContextData:ActivityID%3d0483abd0-f1d6-44e7-bfe8-e951e242b7bd%3bI32%3aADS.C%5bdc-srv%5d%3d1%3bF%3aADS.AL%5bdc-srv%5d%3d1.62791%3bI32%3aATE.C%5bdc-srv.domain.com%5d%3d1%3bF%3aATE.AL%5bdc-srv.domain.com%5d%3d0%3bS%3aWLM.Bal%3d480000%3bS%3aWLM.BT%3dEas_ 444 domain\\user 10.0.12.18 HTTP/1.1 Apple-iPhone11C6/1905.258 - - mail-srv.domain.com:444 200 0 0 600013 9.9.5.1,+10.0.11.6,+10.23.2.39,10.40.59.96`;

    const formatedTestCode = TestHelper.formatTestCodeAndEvents(textEvent);
    assert.strictEqual(formatedTestCode, textEvent);
  });

  test('Корректное выделение нормализованного события из кода теста', async () => {
    const compressedTestCode = `table_list default
table_list {"ESC_Risk_User_Logon_Profiles":[{"risk_type":"supply_chain", "access_type": "us", "login":"admin", "src_ip":"10.0.13.199", "src_host":"10.0.13.199", "dst_ip":"127.0.0.1", "dst_host":"gus"}]}

{"subject.account.name": "admin", "mime": "text/plain", "category.low": "Communication", "labels": "|anomaly_access", "subject": "account", "id": "Vendor_US_WebUI_Auth", "event_src.vendor": "vendor", "object": "application", "event_src.category": "Web server", "event_src.hostname": "gus", "src.ip": "10.0.13.198", "taxonomy_version": "25.0.577-develop", "event_src.title": "us", "category.high": "Access Management", "src.host": "10.0.13.198", "action": "login", "time": "2022-01-25T12:19:22Z", "importance": "medium", "count": 1, "event_src.host": "gus", "input_id": "00000000-0000-0000-0000-000000000000", "status": "success", "generator.type": "logcollector", "recv_time": "2022-02-03T12:17:32Z", "generator.version": "N25.0.2630", "uuid": "62950de1-1ac2-4f54-8e52-8493e5850509", "type": "raw", "recv_ipv4": "127.0.0.1", "body": "<190>Jan 25 12:19:22 gus auth-ui: 2022-01-25 12:19:22,200 DEBUG login user: admin via ip: 10.0.13.198", "task_id": "00000000-0000-0000-0000-000000000000", "normalized": true, "category.generic": "Application"}

expect 1 {}`;

    const formatedTestCode = TestHelper.formatTestCodeAndEvents(compressedTestCode);
    const lines = formatedTestCode.split('\n');

    assert.strictEqual(lines.length, 51);
  });

  test('Форматирование ТС с одной таблицей', async () => {
    const compressedTestCode = `table_list {"ESC_Auto_Profile":[{"rule":"ESC_Anomaly_Access_Gitlab_App","auto_profiling":1}]}`;
    const actual = TestHelper.formatTestCodeAndEvents(compressedTestCode);

    const expected =
      `table_list {\n` +
      `    "ESC_Auto_Profile": [\n` +
      `        {\n` +
      `            "rule": "ESC_Anomaly_Access_Gitlab_App",\n` +
      `            "auto_profiling": 1\n` +
      `        }\n` +
      `    ]\n` +
      `}`;

    assert.strictEqual(actual, expected);
  });
});
