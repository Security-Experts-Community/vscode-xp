import assert = require('assert');
import { Enveloper } from '../../views/integrationTests/enveloper';

suite('Enveloper', () => {
	test('Оборачиваем в конверт xml событие из EventViewer-а', async () => {
		const xmlEvent = 
`<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
<System>
	<Provider Name="Microsoft-Windows-Security-Auditing" Guid="{54849625-5478-4994-a5ba-3e3b0328c30d}" />
	<EventID>4662</EventID>
	<Version>0</Version>
	<Level>0</Level>
	<Task>12804</Task>
	<Opcode>0</Opcode>
	<Keywords>0x8020000000000000</Keywords>
	<TimeCreated SystemTime="2021-01-23T15:16:51.5407675Z" />
	<EventRecordID>95430729</EventRecordID>
	<Correlation ActivityID="{7bf708e0-5d4b-1572-3109-f77b4b5dd901}" />
	<Execution ProcessID="720" ThreadID="33996" />
	<Channel>Security</Channel>
	<Computer>ivanov-pc.example.com</Computer>
	<Security />
</System>
<EventData>
	<Data Name="SubjectUserSid">S-1-5-18</Data>
	<Data Name="SubjectUserName">IVANOV-PC$</Data>
	<Data Name="SubjectDomainName">EXAMPLE</Data>
	<Data Name="SubjectLogonId">0x3e7</Data>
	<Data Name="ObjectServer">WMI</Data>
	<Data Name="ObjectType">WMI Namespace</Data>
	<Data Name="ObjectName">root\\cimv2\\Security\\MicrosoftVolumeEncryption</Data>
	<Data Name="OperationType">Object Access</Data>
	<Data Name="HandleId">0x0</Data>
	<Data Name="AccessList">%%1552
				</Data>
	<Data Name="AccessMask">0x1</Data>
	<Data Name="Properties">-</Data>
	<Data Name="AdditionalInfo">Local Read (ConnectServer)</Data>
	<Data Name="AdditionalInfo2">root\\cimv2\\Security\\MicrosoftVolumeEncryption</Data>
</EventData>
</Event>`;

		const envelopedEvent = await Enveloper.addEnvelope(xmlEvent, "application/x-pt-eventlog");
		const json = JSON.parse(envelopedEvent);

		// Поля конверта.
		assert.ok(json);

		assert.ok(json.body);
		assert.ok(json.recv_time);
		assert.ok(json.uuid);

		assert.strictEqual(json.recv_ipv4, "127.0.0.1");
		assert.strictEqual(json.task_id, "00000000-0000-0000-0000-000000000000");
		assert.strictEqual(json.tag, "some_tag");
		assert.strictEqual(json.mime, "application/x-pt-eventlog");
		assert.strictEqual(json.normalized, false);
		assert.strictEqual(json.input_id, "00000000-0000-0000-0000-000000000000");
		assert.strictEqual(json.type, "raw");
	});

	test('Добавление одного json-события в конверт', async () => {

		const compressedRawEvents = 
		`{"Event":{"xmlns":"http://schemas.microsoft.com/win/2004/08/events/event","System":{"Provider":{"Name":"MSSQLSERVER"},"EventID":{"text":"18453","Qualifiers":"16384"},"Level":"0","Task":"4","Keywords":"0xa0000000000000","TimeCreated":{"SystemTime":"2022-06-24T15:50:01.779402300Z"},"EventRecordID":"6490211","Channel":"Application","Computer":"dc.domain.com","Security":{"UserID":"S-1-5-21-231231-123123-123123-123123"}},"EventData":{"Data":["DOMAIN\\Svc"," [CLIENT: 12.14.32.242]"],"Binary":"436127235725400025130510230612034601230460103460713047013047010234070123"}}}`;
		
		const envelopedRawEvents = await Enveloper.addEnvelope(compressedRawEvents, "application/x-pt-eventlog");

		const actualObject = JSON.parse(envelopedRawEvents);

		assert.strictEqual(actualObject.body, "{\"Event\":{\"xmlns\":\"http://schemas.microsoft.com/win/2004/08/events/event\",\"System\":{\"Provider\":{\"Name\":\"MSSQLSERVER\"},\"EventID\":{\"text\":\"18453\",\"Qualifiers\":\"16384\"},\"Level\":\"0\",\"Task\":\"4\",\"Keywords\":\"0xa0000000000000\",\"TimeCreated\":{\"SystemTime\":\"2022-06-24T15:50:01.779402300Z\"},\"EventRecordID\":\"6490211\",\"Channel\":\"Application\",\"Computer\":\"dc.domain.com\",\"Security\":{\"UserID\":\"S-1-5-21-231231-123123-123123-123123\"}},\"EventData\":{\"Data\":[\"DOMAIN\\Svc\",\" [CLIENT: 12.14.32.242]\"],\"Binary\":\"436127235725400025130510230612034601230460103460713047013047010234070123\"}}}");
		assert.ok(actualObject.recv_time);
		assert.ok(actualObject.uuid);

		assert.strictEqual(actualObject.recv_ipv4, "127.0.0.1");
		assert.strictEqual(actualObject.task_id, "00000000-0000-0000-0000-000000000000");
		assert.strictEqual(actualObject.tag, "some_tag");
		assert.strictEqual(actualObject.mime, "application/x-pt-eventlog");
		assert.strictEqual(actualObject.normalized, false);
		assert.strictEqual(actualObject.input_id, "00000000-0000-0000-0000-000000000000");
		assert.strictEqual(actualObject.type, "raw");
	});


	test('Добавление двух json-событий в конверт', async () => {

		const compressedRawEvents = 
`{"Event":{"xmlns":"http://schemas.microsoft.com/win/2004/08/events/event","System":{"Provider":{"Name":"MSSQLSERVER"},"EventID":{"text":"18453","Qualifiers":"16384"},"Level":"0","Task":"4","Keywords":"0xa0000000000000","TimeCreated":{"SystemTime":"2022-06-24T15:50:01.779402300Z"},"EventRecordID":"6490211","Channel":"Application","Computer":"dc.domain.com","Security":{"UserID":"S-1-5-21-1023000730-721111127-3110000192-11233"}},"EventData":{"Data":["DOMAIN\\Svc"," [CLIENT: 10.10.56.31]"],"Binary":"436127235725400025130510230612034601230460103460713047013047010234070123"}}}
{"Event":{"xmlns":"http://schemas.microsoft.com/win/2004/08/events/event","System":{"Provider":{"Name":"MSSQLSERVER"},"EventID":{"text":"18453","Qualifiers":"16384"},"Level":"0","Task":"4","Keywords":"0xa0000000000000","TimeCreated":{"SystemTime":"2022-06-24T15:50:01.779402300Z"},"EventRecordID":"6490211","Channel":"Application","Computer":"dc.domain.com","Security":{"UserID":"S-1-5-21-1023000730-721111127-3110000192-11233"}},"EventData":{"Data":["DOMAIN\\Svc"," [CLIENT: 10.10.56.31]"],"Binary":"436127235725400025130510230612034601230460103460713047013047010234070123"}}}`;
		
		const envelopedRawEvents = await Enveloper.addEnvelope(compressedRawEvents, "application/x-pt-eventlog");

		const envelopedRawEventsArray = envelopedRawEvents.split("\n");
		assert.ok(envelopedRawEventsArray.length == 2);

		const firstEvent = JSON.parse(envelopedRawEventsArray[0]);

		assert.ok(firstEvent.body);
		assert.ok(firstEvent.recv_time);
		assert.ok(firstEvent.uuid);

		assert.strictEqual(firstEvent.recv_ipv4, "127.0.0.1");
		assert.strictEqual(firstEvent.task_id, "00000000-0000-0000-0000-000000000000");
		assert.strictEqual(firstEvent.tag, "some_tag");
		assert.strictEqual(firstEvent.mime, "application/x-pt-eventlog");
		assert.strictEqual(firstEvent.normalized, false);
		assert.strictEqual(firstEvent.input_id, "00000000-0000-0000-0000-000000000000");
		assert.strictEqual(firstEvent.type, "raw");

		const secondEvent = JSON.parse(envelopedRawEventsArray[1]);

		assert.ok(secondEvent.body);
		assert.ok(secondEvent.recv_time);
		assert.ok(secondEvent.uuid);

		assert.strictEqual(secondEvent.recv_ipv4, "127.0.0.1");
		assert.strictEqual(secondEvent.task_id, "00000000-0000-0000-0000-000000000000");
		assert.strictEqual(secondEvent.tag, "some_tag");
		assert.strictEqual(secondEvent.mime, "application/x-pt-eventlog");
		assert.strictEqual(secondEvent.normalized, false);
		assert.strictEqual(secondEvent.input_id, "00000000-0000-0000-0000-000000000000");
		assert.strictEqual(secondEvent.type, "raw");
	});

	test('Добавление конверта для текстового события', async () => {

		const compressedRawEvents = `2022-07-20 07:03:38 W3SVC2 mail-srv 10.0.25.16 POST /Microsoft-Server-ActiveSync/Proxy/default.eas User=user@domain.com&DeviceId=JUQGGDFCDD29R3H003TJA63E10&DeviceType=iPhone&Cmd=Ping&Log=SC1:1_PrxFrom:10.0.22.211_Ver1:161_HH:mail.domain.com_SmtpAdrs:User%domain.com_Hb:600_Rto:2_Cpo:656_Fet:600000_Mbx:mail.domain.com_Cafe:MBX-SRV.DOMAIN.COM_Dc:dc-srv.domain.com_Throttle:0_SBkOffD:L%2f-470_TmRcv:06:53:38.4480003_TmSt:06:53:38.4519947_TmFin:06:53:38.4519947_TmCmpl:07:03:38.440522_TmCnt:07:03:37.7834641_Budget:(A)Owner%3aS-1-5-21-1023191730-727829927-3110000192-14176%5FJUQGGDFCDD29R3H003TJA63E10%5FiPhone%2cConn%3a0%2cMaxConn%3a10%2cMaxBurst%3a480000%2cBalance%3a480000%2cCutoff%3a600000%2cRechargeRate%3a1800000%2cPolicy%3aGlobalThrottlingPolicy%5F5c9d3d31-7f05-4e14-b8f8-05780608b52f%2cIsServiceAccount%3aFalse%2cLiveTime%3a00%3a00%3a30.6952647%3b(D)Owner%3aS-1-5-21-1023191730-727829927-3110000192-14176%5FJUQGGDFCDD29R3H003TJA63E10%5FiPhone%2cConn%3a0%2cMaxConn%3a10%2cMaxBurst%3a480000%2cBalance%3a480000%2cCutoff%3a600000%2cRechargeRate%3a1800000%2cPolicy%3aGlobalThrottlingPolicy%5F5c9d3d31-7f05-4e14-b8f8-05780608b52f%2cIsServiceAccount%3aFalse%2cLiveTime%3a00%3a00%3a00.6580618_ActivityContextData:ActivityID%3d0483abd0-f1d6-44e7-bfe8-e951e242b7bd%3bI32%3aADS.C%5bdc-srv%5d%3d1%3bF%3aADS.AL%5bdc-srv%5d%3d1.62791%3bI32%3aATE.C%5bdc.domain.com%5d%3d1%3bF%3aATE.AL%5bdc.domain.com%5d%3d0%3bS%3aWLM.Bal%3d480000%3bS%3aWLM.BT%3dEas_ 444 DOMAIN\\USER 23.12.22.38 HTTP/1.1 Apple-iPhone11C6/1905.258 - - dc.domain.com:444 200 0 0 600013 44.29.25.201,+10.140.11.12,+10.140.12.14,10.140.14.15`;
		const envelopedRawEvents = await Enveloper.addEnvelope(compressedRawEvents, "text/plain");

		const actualObject = JSON.parse(envelopedRawEvents);

		assert.ok(actualObject.recv_time);
		assert.ok(actualObject.uuid);

		assert.strictEqual(actualObject.recv_ipv4, "127.0.0.1");
		assert.strictEqual(actualObject.task_id, "00000000-0000-0000-0000-000000000000");
		assert.strictEqual(actualObject.tag, "some_tag");
		assert.strictEqual(actualObject.mime, "text/plain");
		assert.strictEqual(actualObject.normalized, false);
		assert.strictEqual(actualObject.input_id, "00000000-0000-0000-0000-000000000000");
		assert.strictEqual(actualObject.type, "raw");
	});
});