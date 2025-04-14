import * as assert from 'assert';

import { TestHelper } from '../../helpers/testHelper';

suite('TestHelper.testCodeCleaning', () => {
  test('Удаление uuid из двух событий', async () => {
    const testCode = `{
    "normalized": true,
    "uuid": "c38ab502-3958-4c73-b1db-9e7d8c92afec"
}
{
    "normalized": true,
    "uuid": "c38ab502-3958-4c73-b1db-9e7d8c92afec"
}`;

    const expectedTestCode = `{
    "normalized": true
}
{
    "normalized": true
}`;

    const actualTestCode = TestHelper.cleanTestCode(testCode);
    assert.strictEqual(actualTestCode, expectedTestCode);
  });

  test('Удаление последнего поля uuid', async () => {
    const testCode = `expect 1 {
    "normalized": true,
    "uuid": "c38ab502-3958-4c73-b1db-9e7d8c92afec"
}`;

    const expectedTestCode = `expect 1 {
    "normalized": true
}`;

    const actualTestCode = TestHelper.cleanTestCode(testCode);
    assert.strictEqual(actualTestCode, expectedTestCode);
  });

  test('Удаление subevents, _subjects, _object, subevents и subevents.time', async () => {
    const testCode = `expect 1 {
    "subject.account.name": "pushkin",
    "src.port": 63691,
    "category.low": "Permission Groups Discovery",
    "origin_app_id": "00000000-0000-0000-0000-000000000005",
    "subject": "account",
    "_rule": "Active_Directory_Snapshot",
    "subject.account.domain": "testlab",
    "object": "resource",
    "primary_siem_app_id": "00000000-0000-0000-0000-000000000005",
    "src.ip": "172.16.222.132",
    "subject.account.id": "S-1-5-21-1129291328-2819992169-918366777-1118",
    "category.high": "Discovery",
    "src.host": "172.16.222.132",
    "incident.category": "Undefined",
    "correlation_name": "Active_Directory_Snapshot",
    "action": "access",
    "_subjects": [
        {
            "AssetId": null,
            "Fqdn": null,
            "IpAddress": "172.16.222.132",
            "EventTimestamp": "2022-03-28T14:47:27Z"
        },
        {
            "AssetId": null,
            "Fqdn": null,
            "IpAddress": "172.16.222.132",
            "EventTimestamp": "2022-03-28T14:47:23Z"
        },
        {
            "AssetId": null,
            "Fqdn": null,
            "IpAddress": "172.16.222.132",
            "EventTimestamp": "2022-03-28T14:47:25Z"
        },
        {
            "AssetId": null,
            "Fqdn": null,
            "IpAddress": "172.16.222.132",
            "EventTimestamp": "2022-03-28T14:47:27Z"
        },
        {
            "AssetId": null,
            "Fqdn": null,
            "IpAddress": "172.16.222.132",
            "EventTimestamp": "2022-03-28T14:47:27Z"
        }
    ],
    "correlation_type": "event",
    "incident.aggregation.timeout": 7200,
    "_objects": [
        {
            "AssetId": null,
            "Fqdn": null,
            "IpAddress": "172.16.222.132",
            "EventTimestamp": "2022-03-28T14:47:27Z"
        },
        {
            "AssetId": null,
            "Fqdn": null,
            "IpAddress": "172.16.222.132",
            "EventTimestamp": "2022-03-28T14:47:23Z"
        },
        {
            "AssetId": null,
            "Fqdn": "dc4-w16",
            "IpAddress": null,
            "EventTimestamp": "2022-03-28T14:47:23Z"
        },
        {
            "AssetId": null,
            "Fqdn": null,
            "IpAddress": "127.0.0.1",
            "EventTimestamp": "2022-03-28T14:47:23Z"
        },
        {
            "AssetId": null,
            "Fqdn": null,
            "IpAddress": "172.16.222.132",
            "EventTimestamp": "2022-03-28T14:47:25Z"
        },
        {
            "AssetId": null,
            "Fqdn": "dc4-w16",
            "IpAddress": null,
            "EventTimestamp": "2022-03-28T14:47:25Z"
        },
        {
            "AssetId": null,
            "Fqdn": null,
            "IpAddress": "127.0.0.1",
            "EventTimestamp": "2022-03-28T14:47:25Z"
        },
        {
            "AssetId": null,
            "Fqdn": null,
            "IpAddress": "172.16.222.132",
            "EventTimestamp": "2022-03-28T14:47:27Z"
        },
        {
            "AssetId": null,
            "Fqdn": "dc4-w16",
            "IpAddress": null,
            "EventTimestamp": "2022-03-28T14:47:27Z"
        },
        {
            "AssetId": null,
            "Fqdn": null,
            "IpAddress": "127.0.0.1",
            "EventTimestamp": "2022-03-28T14:47:27Z"
        },
        {
            "AssetId": null,
            "Fqdn": null,
            "IpAddress": "172.16.222.132",
            "EventTimestamp": "2022-03-28T14:47:27Z"
        },
        {
            "AssetId": null,
            "Fqdn": "dc4-w16",
            "IpAddress": null,
            "EventTimestamp": "2022-03-28T14:47:27Z"
        },
        {
            "AssetId": null,
            "Fqdn": null,
            "IpAddress": "127.0.0.1",
            "EventTimestamp": "2022-03-28T14:47:27Z"
        }
    ],
    "alert.context": "|(objectClass=attributeSchema)|(objectClass=classSchema)|(objectClass=displaySpecifier)|(objectClass=controlAccessRight)",
    "importance": "medium",
    "count": 1,
    "subevents.time": [
        "2022-03-28T14:47:23Z",
        "2022-03-28T14:47:25Z",
        "2022-03-28T14:47:27Z",
        "2022-03-28T14:47:27Z"
    ],
    "incident.aggregation.key": "Active_Directory_Snapshot|S-1-5-21-1129291328-2819992169-918366777-1118|172.16.222.132",
    "incident.severity": "medium",
    "generator.type": "correlationengine",
    "status": "success",
    "generator.version": "N25.0.2665",
    "subevents": [
        "c961f3e8-fb02-482a-99f2-ef972f898417",
        "1239d8b0-e847-4135-b529-2aa28b6c1add",
        "17fe6ff9-bad0-45ca-a4f3-b1e84574970e",
        "b9154544-c954-4eb1-847b-73bcb20e9cbc"
    ],
    "alert.key": "pushkin|172.16.222.132",
    "normalized": true,
    "category.generic": "Attack"
}`;

    const expectedTestCode = `expect 1 {
    "subject.account.name": "pushkin",
    "src.port": 63691,
    "category.low": "Permission Groups Discovery",
    "origin_app_id": "00000000-0000-0000-0000-000000000005",
    "subject": "account",
    "_rule": "Active_Directory_Snapshot",
    "subject.account.domain": "testlab",
    "object": "resource",
    "primary_siem_app_id": "00000000-0000-0000-0000-000000000005",
    "src.ip": "172.16.222.132",
    "subject.account.id": "S-1-5-21-1129291328-2819992169-918366777-1118",
    "category.high": "Discovery",
    "src.host": "172.16.222.132",
    "incident.category": "Undefined",
    "correlation_name": "Active_Directory_Snapshot",
    "action": "access",
    "correlation_type": "event",
    "incident.aggregation.timeout": 7200,
    "alert.context": "|(objectClass=attributeSchema)|(objectClass=classSchema)|(objectClass=displaySpecifier)|(objectClass=controlAccessRight)",
    "importance": "medium",
    "count": 1,
    "incident.aggregation.key": "Active_Directory_Snapshot|S-1-5-21-1129291328-2819992169-918366777-1118|172.16.222.132",
    "incident.severity": "medium",
    "generator.type": "correlationengine",
    "status": "success",
    "alert.key": "pushkin|172.16.222.132",
    "normalized": true,
    "category.generic": "Attack"
}`;

    const actualTestCode = TestHelper.cleanTestCode(testCode);
    assert.strictEqual(actualTestCode, expectedTestCode);
  });

  test('Удаление generator.version, uuid', async () => {
    const testCode = `expect 1 {
    "src.port": 63691,
    "mime": "application/x-pt-eventlog",
    "object.query": "(objectClass=displaySpecifier)",
    "subject": "account",
    "id": "PT_Microsoft_Windows_eventlog_1644_ldap_query",
    "event_src.vendor": "microsoft",
    "event_src.category": "Directory service",
    "object": "request",
    "event_src.fqdn": "dc4-w16.testlab.esc",
    "event_src.hostname": "dc4-w16",
    "object.value": "(objectClass=displaySpecifier)",
    "src.ip": "172.16.222.132",
    "taxonomy_version": "25.0.606-develop",
    "event_src.subsys": "Directory Service",
    "event_src.title": "windows",
    "object.account.id": "S-1-5-21-1129291328-2819992169-918366777-1118",
    "subject.id": "S-1-5-21-1129291328-2819992169-918366777-1118",
    "object.account.name": "pushkin",
    "src.host": "172.16.222.132",
    "object.process.id": "704",
    "action": "execute",
    "datafield2": "55",
    "importance": "info",
    "event_src.host": "dc4-w16.testlab.esc",
    "object.account.domain": "testlab",
    "datafield1": "704",
    "input_id": "00000000-0000-0000-0000-000000000000",
    "generator.type": "logcollector",
    "status": "success",
    "recv_time": "2022-03-28T18:20:45Z",
    "generator.version": "N25.0.2665",
    "uuid": "17fe6ff9-bad0-45ca-a4f3-b1e84574970e",
    "subject.domain": "testlab",
    "type": "raw",
    "recv_ipv4": "127.0.0.1",
	"body": "{\\"Event\\":{\\"xmlns\\":\\"http://schemas.microsoft.com/win/2004/08/events/event\\",\\"System\\":{\\"Provider\\":{\\"Name\\":\\"Microsoft-Windows-ActiveDirectory_DomainService\\",\\"Guid\\":\\"{0e8478c5-3605-4e8c-8497-1e730c959516}\\",\\"EventSourceName\\":\\"NTDS General\\"},\\"EventID\\":{\\"text\\":\\"1644\\",\\"Qualifiers\\":\\"16384\\"},\\"Version\\":\\"0\\",\\"Level\\":\\"4\\",\\"Task\\":\\"15\\",\\"Opcode\\":\\"0\\",\\"Keywords\\":\\"0x8080000000000000\\",\\"TimeCreated\\":{\\"SystemTime\\":\\"2022-03-28T14:47:27.853914600Z\\"},\\"EventRecordID\\":\\"3027338\\",\\"Correlation\\":null,\\"Execution\\":{\\"ProcessID\\":\\"704\\",\\"ThreadID\\":\\"1340\\"},\\"Channel\\":\\"Directory Service\\",\\"Computer\\":\\"DC4-W16.testlab.esc\\",\\"Security\\":{\\"UserID\\":\\"S-1-5-21-1129291328-2819992169-918366777-1118\\"}},\\"EventData\\":{\\"Data\\":[\\"CN=409,CN=DisplaySpecifiers,CN=Configuration,DC=testlab,DC=esc\\",\\" (objectClass=displaySpecifier) \\",\\"56\\",\\"55\\",\\"172.16.222.132:63691\\",\\"onelevel\\",\\"[all]\\",null,\\"PDNT_index:56:N;\\",\\"1407\\",\\"21\\",\\"0\\",\\"0\\",\\"0\\",\\"47\\",\\"none\\",\\"TESTLAB\\\\pushkin\\"]},\\"RenderingInfo\\":{\\"Culture\\":\\"en-US\\",\\"Message\\":\\"Internal event: A client issued a search operation with the following options. \\r\\n \\r\\nClient:\\r\\n172.16.222.132:63691 \\r\\nStarting node:\\r\\nCN=409,CN=DisplaySpecifiers,CN=Configuration,DC=testlab,DC=esc \\r\\nFilter:\\r\\n (objectClass=displaySpecifier)  \\r\\nSearch scope:\\r\\nonelevel \\r\\nAttribute selection:\\r\\n[all] \\r\\nServer controls:\\r\\n \\r\\nVisited entries:\\r\\n56 \\r\\nReturned entries:\\r\\n55 \\r\\nUsed indexes:\\r\\nPDNT_index:56:N; \\r\\nPages referenced:\\r\\n1407 \\r\\nPages read from disk:\\r\\n21 \\r\\nPages preread from disk:\\r\\n0 \\r\\nClean pages modified:\\r\\n0 \\r\\nDirty pages modified:\\r\\n0 \\r\\nSearch time (ms):\\r\\n47 \\r\\nAttributes Preventing Optimization:\\r\\nnone \\r\\nUser:\\r\\nTESTLAB\\\\pushkin\\",\\"Level\\":\\"Information\\",\\"Task\\":\\"Field Engineering\\",\\"Opcode\\":null,\\"Channel\\":null,\\"Provider\\":null,\\"Keywords\\":{\\"Keyword\\":\\"Classic\\"}}}}",
    "task_id": "00000000-0000-0000-0000-000000000000",
    "subject.name": "pushkin",
    "normalized": true,
    "msgid": "1644"
}`;

    const expectedTestCode = `expect 1 {
    "src.port": 63691,
    "mime": "application/x-pt-eventlog",
    "object.query": "(objectClass=displaySpecifier)",
    "subject": "account",
    "id": "PT_Microsoft_Windows_eventlog_1644_ldap_query",
    "event_src.vendor": "microsoft",
    "event_src.category": "Directory service",
    "object": "request",
    "event_src.fqdn": "dc4-w16.testlab.esc",
    "event_src.hostname": "dc4-w16",
    "object.value": "(objectClass=displaySpecifier)",
    "src.ip": "172.16.222.132",
    "taxonomy_version": "25.0.606-develop",
    "event_src.subsys": "Directory Service",
    "event_src.title": "windows",
    "object.account.id": "S-1-5-21-1129291328-2819992169-918366777-1118",
    "subject.id": "S-1-5-21-1129291328-2819992169-918366777-1118",
    "object.account.name": "pushkin",
    "src.host": "172.16.222.132",
    "object.process.id": "704",
    "action": "execute",
    "datafield2": "55",
    "importance": "info",
    "event_src.host": "dc4-w16.testlab.esc",
    "object.account.domain": "testlab",
    "datafield1": "704",
    "input_id": "00000000-0000-0000-0000-000000000000",
    "generator.type": "logcollector",
    "status": "success",
    "recv_time": "2022-03-28T18:20:45Z",
    "subject.domain": "testlab",
    "type": "raw",
    "recv_ipv4": "127.0.0.1",
	"body": "{\\"Event\\":{\\"xmlns\\":\\"http://schemas.microsoft.com/win/2004/08/events/event\\",\\"System\\":{\\"Provider\\":{\\"Name\\":\\"Microsoft-Windows-ActiveDirectory_DomainService\\",\\"Guid\\":\\"{0e8478c5-3605-4e8c-8497-1e730c959516}\\",\\"EventSourceName\\":\\"NTDS General\\"},\\"EventID\\":{\\"text\\":\\"1644\\",\\"Qualifiers\\":\\"16384\\"},\\"Version\\":\\"0\\",\\"Level\\":\\"4\\",\\"Task\\":\\"15\\",\\"Opcode\\":\\"0\\",\\"Keywords\\":\\"0x8080000000000000\\",\\"TimeCreated\\":{\\"SystemTime\\":\\"2022-03-28T14:47:27.853914600Z\\"},\\"EventRecordID\\":\\"3027338\\",\\"Correlation\\":null,\\"Execution\\":{\\"ProcessID\\":\\"704\\",\\"ThreadID\\":\\"1340\\"},\\"Channel\\":\\"Directory Service\\",\\"Computer\\":\\"DC4-W16.testlab.esc\\",\\"Security\\":{\\"UserID\\":\\"S-1-5-21-1129291328-2819992169-918366777-1118\\"}},\\"EventData\\":{\\"Data\\":[\\"CN=409,CN=DisplaySpecifiers,CN=Configuration,DC=testlab,DC=esc\\",\\" (objectClass=displaySpecifier) \\",\\"56\\",\\"55\\",\\"172.16.222.132:63691\\",\\"onelevel\\",\\"[all]\\",null,\\"PDNT_index:56:N;\\",\\"1407\\",\\"21\\",\\"0\\",\\"0\\",\\"0\\",\\"47\\",\\"none\\",\\"TESTLAB\\\\pushkin\\"]},\\"RenderingInfo\\":{\\"Culture\\":\\"en-US\\",\\"Message\\":\\"Internal event: A client issued a search operation with the following options. \\r\\n \\r\\nClient:\\r\\n172.16.222.132:63691 \\r\\nStarting node:\\r\\nCN=409,CN=DisplaySpecifiers,CN=Configuration,DC=testlab,DC=esc \\r\\nFilter:\\r\\n (objectClass=displaySpecifier)  \\r\\nSearch scope:\\r\\nonelevel \\r\\nAttribute selection:\\r\\n[all] \\r\\nServer controls:\\r\\n \\r\\nVisited entries:\\r\\n56 \\r\\nReturned entries:\\r\\n55 \\r\\nUsed indexes:\\r\\nPDNT_index:56:N; \\r\\nPages referenced:\\r\\n1407 \\r\\nPages read from disk:\\r\\n21 \\r\\nPages preread from disk:\\r\\n0 \\r\\nClean pages modified:\\r\\n0 \\r\\nDirty pages modified:\\r\\n0 \\r\\nSearch time (ms):\\r\\n47 \\r\\nAttributes Preventing Optimization:\\r\\nnone \\r\\nUser:\\r\\nTESTLAB\\\\pushkin\\",\\"Level\\":\\"Information\\",\\"Task\\":\\"Field Engineering\\",\\"Opcode\\":null,\\"Channel\\":null,\\"Provider\\":null,\\"Keywords\\":{\\"Keyword\\":\\"Classic\\"}}}}",
    "task_id": "00000000-0000-0000-0000-000000000000",
    "subject.name": "pushkin",
    "normalized": true,
    "msgid": "1644"
}`;

    const actualTestCode = TestHelper.cleanTestCode(testCode);
    assert.strictEqual(actualTestCode, expectedTestCode);
  });

  test('Удаление из вывода быстрого теста subevents, _subjects, _object, subevents и subevents.time', async () => {
    const testCode = `SUCCESS!
Got results:

{
    "subject.account.name": "pushkin",
    "src.port": 63691,
    "category.low": "Permission Groups Discovery",
    "origin_app_id": "00000000-0000-0000-0000-000000000005",
    "subject": "account",
    "_rule": "Active_Directory_Snapshot",
    "subject.account.domain": "testlab",
    "object": "resource",
    "primary_siem_app_id": "00000000-0000-0000-0000-000000000005",
    "src.ip": "172.16.222.132",
    "subject.account.id": "S-1-5-21-1129291328-2819992169-918366777-1118",
    "category.high": "Discovery",
    "src.host": "172.16.222.132",
    "incident.category": "Undefined",
    "correlation_name": "Active_Directory_Snapshot",
    "action": "access",
    "_subjects": [
        {
            "AssetId": null,
            "Fqdn": null,
            "IpAddress": "172.16.222.132",
            "EventTimestamp": "2022-03-28T14:47:27Z"
        },
        {
            "AssetId": null,
            "Fqdn": null,
            "IpAddress": "172.16.222.132",
            "EventTimestamp": "2022-03-28T14:47:23Z"
        },
        {
            "AssetId": null,
            "Fqdn": null,
            "IpAddress": "172.16.222.132",
            "EventTimestamp": "2022-03-28T14:47:25Z"
        },
        {
            "AssetId": null,
            "Fqdn": null,
            "IpAddress": "172.16.222.132",
            "EventTimestamp": "2022-03-28T14:47:27Z"
        },
        {
            "AssetId": null,
            "Fqdn": null,
            "IpAddress": "172.16.222.132",
            "EventTimestamp": "2022-03-28T14:47:27Z"
        }
    ],
    "correlation_type": "event",
    "incident.aggregation.timeout": 7200,
    "_objects": [
        {
            "AssetId": null,
            "Fqdn": null,
            "IpAddress": "172.16.222.132",
            "EventTimestamp": "2022-03-28T14:47:27Z"
        },
        {
            "AssetId": null,
            "Fqdn": null,
            "IpAddress": "172.16.222.132",
            "EventTimestamp": "2022-03-28T14:47:23Z"
        },
        {
            "AssetId": null,
            "Fqdn": "dc4-w16",
            "IpAddress": null,
            "EventTimestamp": "2022-03-28T14:47:23Z"
        },
        {
            "AssetId": null,
            "Fqdn": null,
            "IpAddress": "127.0.0.1",
            "EventTimestamp": "2022-03-28T14:47:23Z"
        },
        {
            "AssetId": null,
            "Fqdn": null,
            "IpAddress": "172.16.222.132",
            "EventTimestamp": "2022-03-28T14:47:25Z"
        },
        {
            "AssetId": null,
            "Fqdn": "dc4-w16",
            "IpAddress": null,
            "EventTimestamp": "2022-03-28T14:47:25Z"
        },
        {
            "AssetId": null,
            "Fqdn": null,
            "IpAddress": "127.0.0.1",
            "EventTimestamp": "2022-03-28T14:47:25Z"
        },
        {
            "AssetId": null,
            "Fqdn": null,
            "IpAddress": "172.16.222.132",
            "EventTimestamp": "2022-03-28T14:47:27Z"
        },
        {
            "AssetId": null,
            "Fqdn": "dc4-w16",
            "IpAddress": null,
            "EventTimestamp": "2022-03-28T14:47:27Z"
        },
        {
            "AssetId": null,
            "Fqdn": null,
            "IpAddress": "127.0.0.1",
            "EventTimestamp": "2022-03-28T14:47:27Z"
        },
        {
            "AssetId": null,
            "Fqdn": null,
            "IpAddress": "172.16.222.132",
            "EventTimestamp": "2022-03-28T14:47:27Z"
        },
        {
            "AssetId": null,
            "Fqdn": "dc4-w16",
            "IpAddress": null,
            "EventTimestamp": "2022-03-28T14:47:27Z"
        },
        {
            "AssetId": null,
            "Fqdn": null,
            "IpAddress": "127.0.0.1",
            "EventTimestamp": "2022-03-28T14:47:27Z"
        }
    ],
    "alert.context": "|(objectClass=attributeSchema)|(objectClass=classSchema)|(objectClass=displaySpecifier)|(objectClass=controlAccessRight)",
    "importance": "medium",
    "count": 1,
    "subevents.time": [
        "2022-03-28T14:47:23Z",
        "2022-03-28T14:47:25Z",
        "2022-03-28T14:47:27Z",
        "2022-03-28T14:47:27Z"
    ],
    "incident.aggregation.key": "Active_Directory_Snapshot|S-1-5-21-1129291328-2819992169-918366777-1118|172.16.222.132",
    "incident.severity": "medium",
    "generator.type": "correlationengine",
    "status": "success",
    "generator.version": "25.0.2118 (libservice v.2.0.685)",
    "subevents": [
        "c961f3e8-fb02-482a-99f2-ef972f898417",
        "1239d8b0-e847-4135-b529-2aa28b6c1add",
        "17fe6ff9-bad0-45ca-a4f3-b1e84574970e",
        "b9154544-c954-4eb1-847b-73bcb20e9cbc"
    ],
    "uuid": "ea21601f-1196-46a5-8266-f581e3f181de",
    "alert.key": "pushkin|172.16.222.132",
    "normalized": true,
    "category.generic": "Attack"
}
[INFO] Creating temp directory C:\\Output\\temp\\2022-07-28_18-46-16_25.0.9349`;

    const expectedTestCode = `SUCCESS!
Got results:

{
    "subject.account.name": "pushkin",
    "src.port": 63691,
    "category.low": "Permission Groups Discovery",
    "origin_app_id": "00000000-0000-0000-0000-000000000005",
    "subject": "account",
    "_rule": "Active_Directory_Snapshot",
    "subject.account.domain": "testlab",
    "object": "resource",
    "primary_siem_app_id": "00000000-0000-0000-0000-000000000005",
    "src.ip": "172.16.222.132",
    "subject.account.id": "S-1-5-21-1129291328-2819992169-918366777-1118",
    "category.high": "Discovery",
    "src.host": "172.16.222.132",
    "incident.category": "Undefined",
    "correlation_name": "Active_Directory_Snapshot",
    "action": "access",
    "correlation_type": "event",
    "incident.aggregation.timeout": 7200,
    "alert.context": "|(objectClass=attributeSchema)|(objectClass=classSchema)|(objectClass=displaySpecifier)|(objectClass=controlAccessRight)",
    "importance": "medium",
    "count": 1,
    "incident.aggregation.key": "Active_Directory_Snapshot|S-1-5-21-1129291328-2819992169-918366777-1118|172.16.222.132",
    "incident.severity": "medium",
    "generator.type": "correlationengine",
    "status": "success",
    "alert.key": "pushkin|172.16.222.132",
    "normalized": true,
    "category.generic": "Attack"
}
[INFO] Creating temp directory C:\\Output\\temp\\2022-07-28_18-46-16_25.0.9349`;

    const actualTestCode = TestHelper.cleanTestCode(testCode);
    assert.strictEqual(actualTestCode, expectedTestCode);
  });

  test('Удаление siem_id', async () => {
    const testCode = `table_list default
expect 1 {
    "primary_siem_app_id": "00000000-0000-0000-0000-000000000005",
    "siem_id": "e1b2c118-1a86-11ea-9632-e3fa28d252ab",
    "status": "success"
}`;

    const expectedTestCode = `table_list default
expect 1 {
    "primary_siem_app_id": "00000000-0000-0000-0000-000000000005",
    "status": "success"
}`;

    const actualTestCode = TestHelper.cleanTestCode(testCode);
    assert.strictEqual(actualTestCode, expectedTestCode);
  });

  test('Удаление time', async () => {
    const testCode = `SUCCESS!
Got results:

{
    "subject.account.name": "ptarakanovadm",
    "subject.name": "ptarakanovadm",
    "time": "2022-12-06T18:34:01Z"
}
[INFO] Creating temp directory C:\\Output\\temp\\2022-12-20_15-29-25_25.0.9349`;

    const extectedTestCode = `SUCCESS!
Got results:

{
    "subject.account.name": "ptarakanovadm",
    "subject.name": "ptarakanovadm"
}
[INFO] Creating temp directory C:\\Output\\temp\\2022-12-20_15-29-25_25.0.9349`;

    const actualTestCode = TestHelper.cleanTestCode(testCode);
    assert.strictEqual(actualTestCode, extectedTestCode);
  });

  test('Удаление labels', async () => {
    const testCode = `SUCCESS!
Got results:

{
    "_rule": "ESC_Checkpoint_Admin_Modification",
    "incident.severity": "high",
    "labels": "CheckWL_Specific_Only|subject_account_to_attacking_assets|event_source_to_related_assets|src_to_related_assets|subject_account_to_attacking_assets|src_to_related_assets|event_source_to_related_assets",
    "normalized": true
}
[INFO] Creating temp directory C:\\Output\\temp\\2022-12-20_15-29-25_25.0.9349`;

    const expectedTestCode = `SUCCESS!
Got results:

{
    "_rule": "ESC_Checkpoint_Admin_Modification",
    "incident.severity": "high",
    "normalized": true
}
[INFO] Creating temp directory C:\\Output\\temp\\2022-12-20_15-29-25_25.0.9349`;

    const actualTestCode = TestHelper.cleanTestCode(testCode);
    assert.strictEqual(actualTestCode, expectedTestCode);
  });
});
