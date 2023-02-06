import * as assert from 'assert';

import { TestHelper } from '../../helpers/testHelper';

suite('TestHelper.formatTestCode', async () => {

	test('Корректное выделение нормализованного события из кода теста', async () => {

		const compressedTestCode =
			`table_list default
table_list {"ESC_Risk_User_Logon_Profiles":[{"risk_type":"supply_chain", "access_type": "us", "login":"admin", "src_ip":"10.0.13.199", "src_host":"10.0.13.199", "dst_ip":"127.0.0.1", "dst_host":"gus"}]}

{"subject.account.name": "admin", "mime": "text/plain", "category.low": "Communication", "labels": "|anomaly_access", "subject": "account", "id": "Vendor_US_WebUI_Auth", "event_src.vendor": "vendor", "object": "application", "event_src.category": "Web server", "event_src.hostname": "gus", "src.ip": "10.0.13.198", "taxonomy_version": "25.0.577-develop", "event_src.title": "us", "category.high": "Access Management", "src.host": "10.0.13.198", "action": "login", "time": "2022-01-25T12:19:22Z", "importance": "medium", "count": 1, "event_src.host": "gus", "input_id": "00000000-0000-0000-0000-000000000000", "status": "success", "generator.type": "logcollector", "recv_time": "2022-02-03T12:17:32Z", "generator.version": "N25.0.2630", "uuid": "62950de1-1ac2-4f54-8e52-8493e5850509", "type": "raw", "recv_ipv4": "127.0.0.1", "body": "<190>Jan 25 12:19:22 gus auth-ui: 2022-01-25 12:19:22,200 DEBUG login user: admin via ip: 10.0.13.198", "task_id": "00000000-0000-0000-0000-000000000000", "normalized": true, "category.generic": "Application"}

expect 1 {}`;

		const formatedTestCode = TestHelper.formatTestCodeAndEvents(compressedTestCode);
		const lines = formatedTestCode.split("\n");

		assert.strictEqual(lines.length, 51);
	});

	test('Форматирование ТС с одной таблицей', async () => {

		const compressedTestCode = `table_list {"ESC_Auto_Profile":[{"rule":"ESC_Anomaly_Access_Gitlab_App","auto_profiling":1}]}`;
		const actual  = TestHelper.formatTestCodeAndEvents(compressedTestCode);

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