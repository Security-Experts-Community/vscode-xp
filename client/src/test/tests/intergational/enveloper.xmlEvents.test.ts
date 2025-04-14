import assert from 'assert';

import { Enveloper } from '../../../models/enveloper';
import { Configuration } from '../../../models/configuration';

suite('Enveloper', () => {
  test('Событие с значением <unknown process> без экранирования', async () => {
    const xmlEvent = `<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
  <System>
  <Provider Name="Microsoft-Windows-Sysmon" Guid="{5770385f-c22a-43e0-bf4c-06f5698ffbd9}" /> 
  <EventID>8</EventID> 
  <Version>2</Version> 
  <Level>4</Level> 
  <Task>8</Task> 
  <Opcode>0</Opcode> 
  <Keywords>0x8000000000000000</Keywords> 
  <TimeCreated SystemTime="2020-10-17T11:43:36.3126455Z" /> 
  <EventRecordID>417080</EventRecordID> 
  <Correlation /> 
  <Execution ProcessID="3500" ThreadID="4688" /> 
  <Channel>Microsoft-Windows-Sysmon/Operational</Channel> 
  <Computer>MSEDGEWIN10</Computer> 
  <Security UserID="S-1-5-18" /> 
  </System>
  <EventData>
  <Data Name="RuleName" /> 
  <Data Name="UtcTime">2020-10-17 11:43:36.303</Data> 
  <Data Name="SourceProcessGuid">{747f3d96-d8e5-5f8a-0000-0010e1bc7200}</Data> 
  <Data Name="SourceProcessId">2920</Data> 
  <Data Name="SourceImage">C:\\Users\\IEUser\\AppData\\Roaming\\WINWORD.exe</Data> 
  <Data Name="TargetProcessGuid">{747f3d96-d8e8-5f8a-0000-00102cef7200}</Data> 
  <Data Name="TargetProcessId">840</Data> 
  <Data Name="TargetImage"><unknown process></Data> 
  <Data Name="NewThreadId">3608</Data> 
  <Data Name="StartAddress">0x0000000002FF0000</Data> 
  <Data Name="StartModule" /> 
  <Data Name="StartFunction" /> 
  </EventData>
</Event>
`;
    const actualJson = Enveloper.convertSingleEventLogXmlRawEventToJson(xmlEvent);
    const actualObject = JSON.parse(actualJson);

    assert.strictEqual(actualObject.Event.EventData.Data[7].text, `<unknown process>`);
  });

  test('Двойное к существующему событию xml-событие из журнала', async () => {
    const events = `{"body":"{\\"Event\\":{\\"xmlns\\":\\"http://schemas.microsoft.com/win/2004/08/events/event\\",\\"System\\":{\\"Provider\\":{\\"Name\\":\\"Microsoft-Windows-Security-Auditing\\",\\"Guid\\":\\"{54849625-5478-4994-a5ba-3e3b0328c30d}\\"},\\"EventID\\":\\"4688\\",\\"Version\\":\\"1\\",\\"Level\\":\\"0\\",\\"Task\\":\\"13312\\",\\"Opcode\\":\\"0\\",\\"Keywords\\":\\"0x8020000000000000\\",\\"TimeCreated\\":{\\"SystemTime\\":\\"2023-05-31T10:33:55.9138393Z\\"},\\"EventRecordID\\":\\"204087\\",\\"Correlation\\":\\"\\",\\"Execution\\":{\\"ProcessID\\":\\"4\\",\\"ThreadID\\":\\"64\\"},\\"Channel\\":\\"Security\\",\\"Computer\\":\\"COMP-3096.corp.stf\\",\\"Security\\":\\"\\"},\\"EventData\\":{\\"Data\\":[{\\"Name\\":\\"SubjectUserSid\\",\\"text\\":\\"S-1-5-21-1911633879-617351258-157325994-500\\"},{\\"Name\\":\\"SubjectUserName\\",\\"text\\":\\"Administrator\\"},{\\"Name\\":\\"SubjectDomainName\\",\\"text\\":\\"COMP-3096\\"},{\\"Name\\":\\"SubjectLogonId\\",\\"text\\":\\"0x94872f80\\"},{\\"Name\\":\\"NewProcessId\\",\\"text\\":\\"0x2f8\\"},{\\"Name\\":\\"NewProcessName\\",\\"text\\":\\"C:\\\\Windows\\\\System32\\\\mmc.exe\\"},{\\"Name\\":\\"TokenElevationType\\",\\"text\\":\\"%%1936\\"},{\\"Name\\":\\"ProcessId\\",\\"text\\":\\"0x14b4\\"},{\\"Name\\":\\"CommandLine\\",\\"text\\":\\"\\\\"C:\\\\Windows\\\\system32\\\\mmc.exe\\\\" \\\\"C:\\\\Windows\\\\system32\\\\eventvwr.msc\\\\" /s\\"}]}}}","recv_ipv4":"127.0.0.1","recv_time":"2024-03-21T19:09:28.443Z","task_id":"00000000-0000-0000-0000-000000000000","tag":"some_tag","mime":"application/x-pt-eventlog","normalized":false,"input_id":"00000000-0000-0000-0000-000000000000","type":"raw","uuid":"6abb1792-8d3c-4371-9a6c-2de3580d9341"}
- <Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
- <System>
  <Provider Name="Microsoft-Windows-Security-Auditing" Guid="{54849625-5478-4994-a5ba-3e3b0328c30d}" /> 
  <EventID>4688</EventID> 
  <Version>1</Version> 
  <Level>0</Level> 
  <Task>13312</Task> 
  <Opcode>0</Opcode> 
  <Keywords>0x8020000000000000</Keywords> 
  <TimeCreated SystemTime="2023-05-31T10:33:55.9138393Z" /> 
  <EventRecordID>204087</EventRecordID> 
  <Correlation /> 
  <Execution ProcessID="4" ThreadID="64" /> 
  <Channel>Security</Channel> 
  <Computer>COMP-3096.corp.stf</Computer> 
  <Security /> 
  </System>
- <EventData>
  <Data Name="SubjectUserSid">S-1-5-21-1911633879-617351258-157325994-500</Data> 
  <Data Name="SubjectUserName">Administrator</Data> 
  <Data Name="SubjectDomainName">COMP-3096</Data> 
  <Data Name="SubjectLogonId">0x94872f80</Data> 
  <Data Name="NewProcessId">0x2f8</Data> 
  <Data Name="NewProcessName">C:\\Windows\\System32\\mmc.exe</Data> 
  <Data Name="TokenElevationType">%%1936</Data> 
  <Data Name="ProcessId">0x14b4</Data> 
  <Data Name="CommandLine">"C:\\Windows\\system32\\mmc.exe" "C:\\Windows\\system32\\eventvwr.msc" /s</Data> 
  </EventData>
  </Event>`;
    const enveloper = new Enveloper(Configuration.get());
    const envelopedEvents = enveloper.addEnvelope(events, 'application/x-pt-eventlog');

    assert.strictEqual(envelopedEvents.length, 2);
    const json1 = JSON.parse(envelopedEvents[0]);
    assert.ok(json1);

    const json2 = JSON.parse(envelopedEvents[1]);
    assert.ok(json2);
  });

  test('К событию в конверте добавляется xml-событие из журнала Windows', async () => {
    const events = `{"recv_ipv4": "192.168.40.146", "recv_time": "2020-01-27T06:12:53Z", "body": "{\\"Event\\":{\\"xmlns\\":\\"http://schemas.microsoft.com/win/2004/08/events/event\\",\\"System\\":{\\"Provider\\":{\\"Name\\":\\"Microsoft-Windows-Security-Auditing\\",\\"Guid\\":\\"{54849625-5478-4994-A5BA-3E3B0328C30D}\\"},\\"EventID\\":\\"4688\\",\\"Version\\":\\"2\\",\\"Level\\":\\"0\\",\\"Task\\":\\"13312\\",\\"Opcode\\":\\"0\\",\\"Keywords\\":\\"0x8020000000000000\\",\\"TimeCreated\\":{\\"SystemTime\\":\\"2020-01-23T10:18:31.616030800Z\\"},\\"EventRecordID\\":\\"6925090\\",\\"Correlation\\":null,\\"Execution\\":{\\"ProcessID\\":\\"4\\",\\"ThreadID\\":\\"5460\\"},\\"Channel\\":\\"Security\\",\\"Computer\\":\\"WIN10X64-133.testlab.org\\",\\"Security\\":null},\\"EventData\\":{\\"Data\\":[{\\"text\\":\\"S-1-5-21-3389064948-2957360831-125328159-1105\\",\\"Name\\":\\"SubjectUserSid\\"},{\\"text\\":\\"test-admin\\",\\"Name\\":\\"SubjectUserName\\"},{\\"text\\":\\"TESTLAB\\",\\"Name\\":\\"SubjectDomainName\\"},{\\"text\\":\\"0x1c3869\\",\\"Name\\":\\"SubjectLogonId\\"},{\\"text\\":\\"0xb28\\",\\"Name\\":\\"NewProcessId\\"},{\\"text\\":\\"C:\\\\Users\\\\test-admin\\\\Documents\\\\Tools for raw events\\\\mimikatz\\\\x64\\\\mimikatz.exe\\",\\"Name\\":\\"NewProcessName\\"},{\\"text\\":\\"%%1937\\",\\"Name\\":\\"TokenElevationType\\"},{\\"text\\":\\"0x1530\\",\\"Name\\":\\"ProcessId\\"},{\\"text\\":\\"\\\\"C:\\\\Users\\\\test-admin\\\\Documents\\\\Tools for raw events\\\\mimikatz\\\\x64\\\\mimikatz.exe\\\\" privilege::debug\\",\\"Name\\":\\"CommandLine\\"},{\\"text\\":\\"S-1-0-0\\",\\"Name\\":\\"TargetUserSid\\"},{\\"text\\":\\"-\\",\\"Name\\":\\"TargetUserName\\"},{\\"text\\":\\"-\\",\\"Name\\":\\"TargetDomainName\\"},{\\"text\\":\\"0x0\\",\\"Name\\":\\"TargetLogonId\\"},{\\"text\\":\\"C:\\\\Windows\\\\System32\\\\WindowsPowerShell\\\\v1.0\\\\powershell.exe\\",\\"Name\\":\\"ParentProcessName\\"},{\\"text\\":\\"S-1-16-12288\\",\\"Name\\":\\"MandatoryLabel\\"}]}}}", "mime": "application/x-pt-eventlog", "tag": "wineventlog", "uuid": "00000005-e2e7-0f65-f000-0000119dd0a4", "input_id": "d8c86b6f-83bf-4c13-921b-a8403077119a", "job_id": "a4d09d11-927a-4cb6-9f4f-971106247fdd", "normalized": false, "corrections": {}, "historical": false}", "mime": "application/x-pt-eventlog", "tag": "wineventlog", "uuid": "00000005-e2e7-0f65-f000-0000119dd0a4", "input_id": "d8c86b6f-83bf-4c13-921b-a8403077119a", "job_id": "a4d09d11-927a-4cb6-9f4f-971106247fdd", "normalized": false, "corrections": {}, "historical": false}
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
    const enveloper = new Enveloper(Configuration.get());
    const envelopedEvents = enveloper.addEnvelope(events, 'application/x-pt-eventlog');

    assert.strictEqual(envelopedEvents.length, 2);
    const json1 = JSON.parse(envelopedEvents[0]);
    assert.ok(json1);

    const json2 = JSON.parse(envelopedEvents[1]);
    assert.ok(json2);
  });

  test('Оборачиваем в конверт xml несколько событий из EventViewer с артефактами копирования', async () => {
    const xmlEvent = `- <Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
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
    const enveloper = new Enveloper(Configuration.get());
    const envelopedEvents = enveloper.addEnvelope(xmlEvent, 'application/x-pt-eventlog');

    assert.strictEqual(envelopedEvents.length, 3);
    const envelopedEvent = JSON.parse(envelopedEvents[0]);

    assert.ok(envelopedEvent);
    assert.ok(envelopedEvent.body);
    assert.ok(envelopedEvent.recv_time);
    assert.ok(envelopedEvent.uuid);
  });

  test('Оборачиваем в конверт xml событие из EventViewer с артефактами копирования', async () => {
    const xmlEvent = `- <Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
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
    const enveloper = new Enveloper(Configuration.get());
    const envelopedEvents = enveloper.addEnvelope(xmlEvent, 'application/x-pt-eventlog');

    assert.strictEqual(envelopedEvents.length, 1);
    const envelopedEvent = JSON.parse(envelopedEvents[0]);

    assert.ok(envelopedEvent);
    assert.ok(envelopedEvent.body);
    assert.ok(envelopedEvent.recv_time);
    assert.ok(envelopedEvent.uuid);
  });

  test('Оборачиваем в конверт xml событие из EventViewer-а без артефактов копирования', async () => {
    const xmlEvent = `<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
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
    const enveloper = new Enveloper(Configuration.get());
    const envelopedEvents = enveloper.addEnvelope(xmlEvent, 'application/x-pt-eventlog');
    assert.strictEqual(envelopedEvents.length, 1);

    const envelopedEvent = JSON.parse(envelopedEvents[0]);

    assert.ok(envelopedEvent);
    assert.ok(envelopedEvent.body);
    assert.ok(envelopedEvent.recv_time);
    assert.ok(envelopedEvent.uuid);
  });

  test('Проверка xml', async () => {
    const xmlEvent = `<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
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
    const xmlEvent = `<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
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

    const jsonEvent = Enveloper.convertEventLogXmlRawEventsToJson(xmlEvent);

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
    const xmlEvent = `- <Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
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

    const jsonEvent = Enveloper.convertEventLogXmlRawEventsToJson(xmlEvent);

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
