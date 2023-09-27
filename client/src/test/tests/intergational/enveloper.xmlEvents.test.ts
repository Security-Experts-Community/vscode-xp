import assert = require('assert');
import { Enveloper } from '../../../models/enveloper';
import { XpException } from '../../../models/xpException';
import { StringHelper } from '../../../helpers/stringHelper';

suite('Enveloper', () => {

// TODO: Проверить корректность обработки событий и либо убрать, либо оставить.
// 	test('Xml-событие от MSSQLSERVER', async () => {
// 		const events =
// `- <Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
// - <System>
//   <Provider Name="MSSQLSERVER" /> 
//   <EventID Qualifiers="16384">33205</EventID> 
//   <Level>0</Level> 
//   <Task>5</Task> 
//   <Keywords>0xa0000000000000</Keywords> 
//   <TimeCreated SystemTime="2023-08-11T14:49:05.592435300Z" /> 
//   <EventRecordID>9894</EventRecordID> 
//   <Channel>Application</Channel> 
//   <Computer>db-mysql.rf.plat.form</Computer> 
//   <Security /> 
//   </System>
// - <EventData>
//   <Data>Audit event: audit_schema_version:1
// event_time:2023-08-11 14:49:05.4662406
// sequence_number:1
// action_id:BCM 
// succeeded:true
// is_column_permission:false
// session_id:68
// server_principal_id:259
// database_principal_id:1
// target_server_principal_id:0
// target_database_principal_id:0
// object_id:1
// user_defined_event_id:0
// transaction_id:0
// class_type:DB
// duration_milliseconds:0
// response_rows:1
// affected_rows:1
// client_tls_version:0
// database_transaction_id:0
// ledger_start_sequence_number:0
// client_ip:local machine
// permission_bitmask:00000000000000000000000000000000
// sequence_group_id:02BE335D-A7DF-4380-87C1-FC1CD4F0A0A1
// session_server_principal_name:rf\\Administrator
// server_principal_name:rf\\Administrator
// server_principal_sid:01050000000000051500000067b15af061b134046d027e18f4010000
// database_principal_name:dbo
// target_server_principal_name:
// target_server_principal_sid:
// target_database_principal_name:
// server_instance_name:db-mysql
// database_name:master
// schema_name:
// object_name:master
// statement:select IS_SRVROLEMEMBER('sysadmin')
// additional_information:
// user_defined_information:
// application_name:Microsoft SQL Server Management Studio - Query
// connection_id:908F4A9F-4462-46B8-AF64-0F2DE69D250C
// data_sensitivity_information:
// host_name:DB-MYSQL
// session_context:
// client_tls_version_name:
// external_policy_permissions_checked:</Data> 
//   </EventData>
//   </Event>`;

// 		const envelopedEvents = await Enveloper.addEnvelope(events, "application/x-pt-eventlog");

// 		assert.strictEqual(envelopedEvents.length, 1);
// 		assert.ok(envelopedEvents[0].includes('\\n'));
// 	});

	test('К событию в конверте добавляется xml-событие из журнала Windows', async () => {
		const events =
`{"recv_ipv4": "192.168.40.146", "recv_time": "2020-01-27T06:12:53Z", "body": "{\\"Event\\":{\\"xmlns\\":\\"http://schemas.microsoft.com/win/2004/08/events/event\\",\\"System\\":{\\"Provider\\":{\\"Name\\":\\"Microsoft-Windows-Security-Auditing\\",\\"Guid\\":\\"{54849625-5478-4994-A5BA-3E3B0328C30D}\\"},\\"EventID\\":\\"4688\\",\\"Version\\":\\"2\\",\\"Level\\":\\"0\\",\\"Task\\":\\"13312\\",\\"Opcode\\":\\"0\\",\\"Keywords\\":\\"0x8020000000000000\\",\\"TimeCreated\\":{\\"SystemTime\\":\\"2020-01-23T10:18:31.616030800Z\\"},\\"EventRecordID\\":\\"6925090\\",\\"Correlation\\":null,\\"Execution\\":{\\"ProcessID\\":\\"4\\",\\"ThreadID\\":\\"5460\\"},\\"Channel\\":\\"Security\\",\\"Computer\\":\\"WIN10X64-133.testlab.org\\",\\"Security\\":null},\\"EventData\\":{\\"Data\\":[{\\"text\\":\\"S-1-5-21-3389064948-2957360831-125328159-1105\\",\\"Name\\":\\"SubjectUserSid\\"},{\\"text\\":\\"test-admin\\",\\"Name\\":\\"SubjectUserName\\"},{\\"text\\":\\"TESTLAB\\",\\"Name\\":\\"SubjectDomainName\\"},{\\"text\\":\\"0x1c3869\\",\\"Name\\":\\"SubjectLogonId\\"},{\\"text\\":\\"0xb28\\",\\"Name\\":\\"NewProcessId\\"},{\\"text\\":\\"C:\\\\Users\\\\test-admin\\\\Documents\\\\Tools for raw events\\\\mimikatz\\\\x64\\\\mimikatz.exe\\",\\"Name\\":\\"NewProcessName\\"},{\\"text\\":\\"%%1937\\",\\"Name\\":\\"TokenElevationType\\"},{\\"text\\":\\"0x1530\\",\\"Name\\":\\"ProcessId\\"},{\\"text\\":\\"\\\\"C:\\\\Users\\\\test-admin\\\\Documents\\\\Tools for raw events\\\\mimikatz\\\\x64\\\\mimikatz.exe\\\\" privilege::debug\\",\\"Name\\":\\"CommandLine\\"},{\\"text\\":\\"S-1-0-0\\",\\"Name\\":\\"TargetUserSid\\"},{\\"text\\":\\"-\\",\\"Name\\":\\"TargetUserName\\"},{\\"text\\":\\"-\\",\\"Name\\":\\"TargetDomainName\\"},{\\"text\\":\\"0x0\\",\\"Name\\":\\"TargetLogonId\\"},{\\"text\\":\\"C:\\\\Windows\\\\System32\\\\WindowsPowerShell\\\\v1.0\\\\powershell.exe\\",\\"Name\\":\\"ParentProcessName\\"},{\\"text\\":\\"S-1-16-12288\\",\\"Name\\":\\"MandatoryLabel\\"}]}}}", "mime": "application/x-pt-eventlog", "tag": "wineventlog", "uuid": "00000005-e2e7-0f65-f000-0000119dd0a4", "input_id": "d8c86b6f-83bf-4c13-921b-a8403077119a", "job_id": "a4d09d11-927a-4cb6-9f4f-971106247fdd", "normalized": false, "corrections": {}, "historical": false}", "mime": "application/x-pt-eventlog", "tag": "wineventlog", "uuid": "00000005-e2e7-0f65-f000-0000119dd0a4", "input_id": "d8c86b6f-83bf-4c13-921b-a8403077119a", "job_id": "a4d09d11-927a-4cb6-9f4f-971106247fdd", "normalized": false, "corrections": {}, "historical": false}
- <Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
- <System>
  <Provider Name="Microsoft-Windows-Security-Auditing" Guid="{54849625-5478-4994-a5ba-3e3b0328c30d}" /> 
  <EventID>4688</EventID> 
  <Version>2</Version> 
  <Level>0</Level> 
  <Task>13312</Task> 
  <Opcode>0</Opcode> 
  <Keywords>0x8020000000000000</Keywords> 
  <TimeCreated SystemTime="2023-07-26T13:00:30.5108710Z" /> 
  <EventRecordID>112584468</EventRecordID> 
  <Correlation /> 
  <Execution ProcessID="4" ThreadID="6892" /> 
  <Channel>Security</Channel> 
  <Computer>sivanov.company.com</Computer> 
  <Security /> 
  </System>
- <EventData>
  <Data Name="SubjectUserSid">S-1-5-18</Data> 
  <Data Name="SubjectUserName">SIVANOV$</Data> 
  <Data Name="SubjectDomainName">company</Data> 
  <Data Name="SubjectLogonId">0x3e7</Data> 
  <Data Name="NewProcessId">0x1e68</Data> 
  <Data Name="NewProcessName">C:\\Windows\\System32\\mmc.exe</Data> 
  <Data Name="TokenElevationType">%%1937</Data> 
  <Data Name="ProcessId">0x8aac</Data> 
  <Data Name="CommandLine">"C:\\windows\\system32\\mmc.exe" "C:\\windows\\system32\\eventvwr.msc" /s</Data> 
  <Data Name="TargetUserSid">S-1-5-21-12412512-33632161-31613613-4734737</Data> 
  <Data Name="TargetUserName">sivanov</Data> 
  <Data Name="TargetDomainName">company</Data> 
  <Data Name="TargetLogonId">0x126149061</Data> 
  <Data Name="ParentProcessName">C:\\Windows\\explorer.exe</Data> 
  <Data Name="MandatoryLabel">S-1-16-12288</Data> 
  </EventData>
  </Event>`;

		const envelopedEvents = await Enveloper.addEnvelope(events, "application/x-pt-eventlog");

		assert.strictEqual(envelopedEvents.length, 2);
		const json1 = JSON.parse(envelopedEvents[0]);
		assert.ok(json1);
		
		const json2 = JSON.parse(envelopedEvents[1]);
		assert.ok(json2);
	});


	test('Оборачиваем в конверт xml несколько событий из EventViewer с артефактами копирования', async () => {
		const xmlEvent = 
`- <Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
- <System>
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
- <EventData>
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
</Event>
- <Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
- <System>
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
- <EventData>
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
</Event>
- <Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
- <System>
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
- <EventData>
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
</Event>
`;

		const envelopedEvents = await Enveloper.addEnvelope(xmlEvent, "application/x-pt-eventlog");

		assert.strictEqual(envelopedEvents.length, 3);
		const envelopedEvent = JSON.parse(envelopedEvents[0]);
		
		assert.ok(envelopedEvent);
		assert.ok(envelopedEvent.body);
		assert.ok(envelopedEvent.recv_time);
		assert.ok(envelopedEvent.uuid);
	});

	test('Оборачиваем в конверт xml событие из EventViewer с артефактами копирования', async () => {
		const xmlEvent = 
`- <Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
- <System>
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
- <EventData>
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

		const envelopedEvents = await Enveloper.addEnvelope(xmlEvent, "application/x-pt-eventlog");

		assert.strictEqual(envelopedEvents.length, 1);
		const envelopedEvent = JSON.parse(envelopedEvents[0]);
		
		assert.ok(envelopedEvent);
		assert.ok(envelopedEvent.body);
		assert.ok(envelopedEvent.recv_time);
		assert.ok(envelopedEvent.uuid);
	});

	test('Оборачиваем в конверт xml событие из EventViewer-а без артефактов копирования', async () => {
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

		const envelopedEvents = await Enveloper.addEnvelope(xmlEvent, "application/x-pt-eventlog");
		assert.strictEqual(envelopedEvents.length, 1);

		const envelopedEvent = JSON.parse(envelopedEvents[0]);
		
		assert.ok(envelopedEvent);
		assert.ok(envelopedEvent.body);
		assert.ok(envelopedEvent.recv_time);
		assert.ok(envelopedEvent.uuid);
	});


	test('Проверка xml', async () => {

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

		assert.ok(Enveloper.isRawEventXml(xmlEvent));
	});

	test('Одно событие с корректным xml', async () => {

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

		const jsonEvent = Enveloper.сonvertEventLogXmlRawEventsToJson(xmlEvent);

		assert.ok(jsonEvent);
		// assert.ok(jsonEvent.Event);
		// assert.ok(jsonEvent.Event.System);

		// assert.strictEqual(jsonEvent.Event.System.EventID, "4662");

		// assert.ok(jsonEvent.Event.EventData);

		// assert.strictEqual(jsonEvent.Event.EventData.Data[0].Name, "SubjectUserSid");
		// assert.strictEqual(jsonEvent.Event.EventData.Data[0].text, "S-1-5-18");

		// assert.strictEqual(jsonEvent.Event.EventData.Data[13].Name, "AdditionalInfo2");
		// assert.strictEqual(jsonEvent.Event.EventData.Data[13].text, "root\\cimv2\\Security\\MicrosoftVolumeEncryption");
	});	
	
	test('Одно событие с xml с артефактами в виде минусов, которые появляются при копировании из EventViewer', async () => {

		const xmlEvent = 
`- <Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
- <System>
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
- <EventData>
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

		const jsonEvent = Enveloper.сonvertEventLogXmlRawEventsToJson(xmlEvent);

		assert.ok(jsonEvent);
		// assert.ok(jsonEvent.Event);
		// assert.ok(jsonEvent.Event.System);

		// assert.strictEqual(jsonEvent.Event.System.EventID, "4662");

		// assert.ok(jsonEvent.Event.EventData);

		// assert.strictEqual(jsonEvent.Event.EventData.Data[0].Name, "SubjectUserSid");
		// assert.strictEqual(jsonEvent.Event.EventData.Data[0].text, "S-1-5-18");

		// assert.strictEqual(jsonEvent.Event.EventData.Data[13].Name, "AdditionalInfo2");
		// assert.strictEqual(jsonEvent.Event.EventData.Data[13].text, "root\\cimv2\\Security\\MicrosoftVolumeEncryption");
	});
});