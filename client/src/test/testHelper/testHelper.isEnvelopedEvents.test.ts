import * as assert from 'assert';

import { TestHelper } from '../../helpers/testHelper';

suite('TestHelper.isEnvelopedEvents', async () => {
	test('Проверка, добавлен ли был уже конверт на три события в конверте.', async () => {

		const rawEvent = 
`
{"body":"{\\"Event\\":{\\"xmlns\\":\\"http://schemas.microsoft.com/win/2004/08/events/event\\",\\"System\\":{\\"Provider\\":{\\"Name\\":\\"MSSQLSERVER\\"},\\"EventID\\":{\\"text\\":\\"18453\\",\\"Qualifiers\\":\\"16384\\"},\\"Level\\":\\"0\\",\\"Task\\":\\"4\\",\\"Keywords\\":\\"0xa0000000000000\\",\\"TimeCreated\\":{\\"SystemTime\\":\\"2022-03-03T12:46:22.146483700Z\\"},\\"EventRecordID\\":\\"4243023\\",\\"Channel\\":\\"Application\\",\\"Computer\\":\\"dc.domain.com\\",\\"Security\\":{\\"UserID\\":\\"S-1-5-21-1023000730-721111127-3110000192-11233\\"}},\\"EventData\\":{\\"Data\\":[\\"domain\\\\Svc-1C\\",\\" [CLIENT: 192.168.1.2]\\"],\\"Binary\\":\\"436127235725400025130510230612034601230460103460713047013047010234070123\\"}}}","recv_ipv4":"127.0.0.1","recv_time":"2022-02-24T13:38:05Z","task_id":"00000000-0000-0000-0000-000000000000","mime":"application/x-pt-eventlog","normalized":false,"input_id":"00000000-0000-0000-0000-000000000000","type":"raw","uuid":"0f6ca38d-99af-42b4-8c9d-accd5614c484"}
`;
		const result = TestHelper.isEnvelopedEvents(rawEvent);
		assert.ok(result);
	});

	test('Проверка, добавлен ли был уже конверт на три сырых события.', async () => {

		const rawEvent = 
`
{"Event":{"xmlns":"http://schemas.microsoft.com/win/2004/08/events/event","System":{"Provider":{"Name":"MSSQLSERVER"},"EventID":{"text":"18453","Qualifiers":"16384"},"Level":"0","Task":"4","Keywords":"0xa0000000000000","TimeCreated":{"SystemTime":"2022-06-24T15:50:01.779402300Z"},"EventRecordID":"6490211","Channel":"Application","Computer":"dc.domain.com","Security":{"UserID":"S-1-5-21-1023000730-721111127-3110000192-11233"}},"EventData":{"Data":["domain\\\\Svc-1C"," [CLIENT: 192.168.1.1]"],"Binary":"436127235725400025130510230612034601230460103460713047013047010234070123"}}}
{"Event":{"xmlns":"http://schemas.microsoft.com/win/2004/08/events/event","System":{"Provider":{"Name":"MSSQLSERVER"},"EventID":{"text":"18453","Qualifiers":"16384"},"Level":"0","Task":"4","Keywords":"0xa0000000000000","TimeCreated":{"SystemTime":"2022-06-24T15:50:01.779402300Z"},"EventRecordID":"6490211","Channel":"Application","Computer":"dc.domain.com","Security":{"UserID":"S-1-5-21-1023000730-721111127-3110000192-11233"}},"EventData":{"Data":["domain\\\\Svc-1C"," [CLIENT: 192.168.1.1]"],"Binary":"436127235725400025130510230612034601230460103460713047013047010234070123"}}}
{"Event":{"xmlns":"http://schemas.microsoft.com/win/2004/08/events/event","System":{"Provider":{"Name":"MSSQLSERVER"},"EventID":{"text":"18453","Qualifiers":"16384"},"Level":"0","Task":"4","Keywords":"0xa0000000000000","TimeCreated":{"SystemTime":"2022-06-24T15:50:01.779402300Z"},"EventRecordID":"6490211","Channel":"Application","Computer":"dc.domain.com","Security":{"UserID":"S-1-5-21-1023000730-721111127-3110000192-11233"}},"EventData":{"Data":["domain\\\\Svc-1C"," [CLIENT: 192.168.1.1]"],"Binary":"436127235725400025130510230612034601230460103460713047013047010234070123"}}}
`;
		const result = TestHelper.isEnvelopedEvents(rawEvent);
		assert.ok(!result);
	});

	test('Проверка, добавлен ли был уже конверт на одно сырое событие.', async () => {

		const rawEvent = "{\"Event\":{\"xmlns\":\"http://schemas.microsoft.com/win/2004/08/events/event\",\"System\":{\"Provider\":{\"Name\":\"MSSQLSERVER\"},\"EventID\":{\"text\":\"18453\",\"Qualifiers\":\"16384\"},\"Level\":\"0\",\"Task\":\"4\",\"Keywords\":\"0xa0000000000000\",\"TimeCreated\":{\"SystemTime\":\"2022-06-24T15:50:01.779402300Z\"},\"EventRecordID\":\"6490211\",\"Channel\":\"Application\",\"Computer\":\"dc.domain.com\",\"Security\":{\"UserID\":\"S-1-5-21-1023000730-721111127-3110000192-11233\"}},\"EventData\":{\"Data\":[\"domain\\\\Svc-1C\",\" [CLIENT: 192.168.1.1]\"],\"Binary\":\"436127235725400025130510230612034601230460103460713047013047010234070123\"}}}";
		const result = TestHelper.isEnvelopedEvents(rawEvent);
		assert.ok(!result);
	});
});