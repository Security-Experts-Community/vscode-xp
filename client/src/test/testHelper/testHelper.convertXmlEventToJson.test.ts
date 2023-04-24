import * as assert from 'assert';

import { TestHelper } from '../../helpers/testHelper';

suite('TestHelper.convertXmlEventToJson', async () => {

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

		const jsonEvent = TestHelper.convertXmlEventToJsonObject(xmlEvent);

		assert.ok(jsonEvent);
		assert.ok(jsonEvent.Event);
		assert.ok(jsonEvent.Event.System);

		assert.strictEqual(jsonEvent.Event.System.EventID, "4662");

		assert.ok(jsonEvent.Event.EventData);

		assert.strictEqual(jsonEvent.Event.EventData.Data[0].Name, "SubjectUserSid");
		assert.strictEqual(jsonEvent.Event.EventData.Data[0].text, "S-1-5-18");

		assert.strictEqual(jsonEvent.Event.EventData.Data[13].Name, "AdditionalInfo2");
		assert.strictEqual(jsonEvent.Event.EventData.Data[13].text, "root\\cimv2\\Security\\MicrosoftVolumeEncryption");
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

		const jsonEvent = TestHelper.convertXmlEventToJsonObject(xmlEvent);

		assert.ok(jsonEvent);
		assert.ok(jsonEvent.Event);
		assert.ok(jsonEvent.Event.System);

		assert.strictEqual(jsonEvent.Event.System.EventID, "4662");

		assert.ok(jsonEvent.Event.EventData);

		assert.strictEqual(jsonEvent.Event.EventData.Data[0].Name, "SubjectUserSid");
		assert.strictEqual(jsonEvent.Event.EventData.Data[0].text, "S-1-5-18");

		assert.strictEqual(jsonEvent.Event.EventData.Data[13].Name, "AdditionalInfo2");
		assert.strictEqual(jsonEvent.Event.EventData.Data[13].text, "root\\cimv2\\Security\\MicrosoftVolumeEncryption");
	});


});