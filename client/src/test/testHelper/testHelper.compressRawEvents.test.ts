import * as vscode from 'vscode';
import * as assert from 'assert';

import { TestHelper } from '../../helpers/testHelper';

suite('TestHelper.compressRawEvents', async () => {
  test('Сжатие одного события с новыми строками', async () => {
    const rawEventsFromSIEM = `{
	"Event": {
		"xmlns": "http://schemas.microsoft.com/win/2004/08/events/event",
		"System": {
			"Provider": {
				"Name": "Microsoft-Windows-PowerShell",
				"Guid": "{a0c1853b-5c40-4b15-8766-3cf1c58f985a}"
			},
			"EventID": "4104",
			"Version": "1",
			"Level": "5",
			"Task": "2",
			"Opcode": "15",
			"Keywords": "0x0",
			"TimeCreated": {
				"SystemTime": "2022-07-07T09:13:49.9161942Z"
			},
			"EventRecordID": "814872",
			"Correlation": {
				"ActivityID": "{60e8c5c4-7b3c-0002-3a8e-2d613c7bd801}"
			},
			"Execution": {
				"ProcessID": "25420",
				"ThreadID": "13636"
			},
			"Channel": "Microsoft-Windows-PowerShell/Operational",
			"Computer": "Test_w10x64-132.testlab.esc",
			"Security": {
				"UserID": "S-1-5-21-1129291328-2819992169-918366777-1113"
			}
		},
		"EventData": {
			"Data": [
				{
					"text": "1",
					"Name": "MessageNumber"
				},
				{
					"text": "1",
					"Name": "MessageTotal"
				},
				{
					"text": "(‘6e,6f,74,65,70,61,64'.SPLiT(‘,’) |fOREAch {( [cHar]([COnVERt]::tOINt16(([STRINg]$_ ) ,16 ))) })-jOIn ''",
					"Name": "ScriptBlockText"
				},
				{
					"text": "627f927a-2f62-4ce7-b988-966fa1030ec6",
					"Name": "ScriptBlockId"
				},
				{
					"Name": "Path"
				}
			]
		},
		"RenderingInfo": {
			"Culture": "en-US",
			"Message": "Creating Scriptblock text (1 of 1):\\r\\n(‘6e,6f,74,65,70,61,64'.SPLiT(‘,’) |fOREAch {( [cHar]([COnVERt]::tOINt16(([STRINg]$_ ) ,16 ))) })-jOIn ''\\r\\n\\r\\nScriptBlock ID: 627f927a-2f62-4ce7-b988-966fa1030ec6\\r\\nPath: ",
			"Level": "Verbose",
			"Task": "Execute a Remote Command",
			"Opcode": "On create calls",
			"Channel": "Microsoft-Windows-PowerShell/Operational",
			"Provider": null,
			"Keywords": null
		}
	}
}`;

    const compressedRawEventsString = TestHelper.compressJsonRawEvents(rawEventsFromSIEM);

    const lines = compressedRawEventsString.split('\n');
    assert.strictEqual(lines.length, 1);
  });

  test('Сжатие двух событий', async () => {
    const rawEventsFromSIEM = `{
	"Event": {
		"xmlns": "http://schemas.microsoft.com/win/2004/08/events/event",
		"System": {
			"Provider": {
				"Name": "MSSQLSERVER"
			},
			"EventID": {
				"text": "18453",
				"Qualifiers": "16384"
			},
			"Level": "0",
			"Task": "4",
			"Keywords": "0xa0000000000000",
			"TimeCreated": {
				"SystemTime": "2022-06-24T15:50:01.779402300Z"
			},
			"EventRecordID": "6490211",
			"Channel": "Application",
			"Computer": "dc.domain.com",
			"Security": {
				"UserID": "S-1-5-21-11111-111111-111111-111111"
			}
		},
		"EventData": {
			"Data": [
				"DOMAIN\\\\Sv",
				" [CLIENT: 111.111.111.111]"
			],
			"Binary": "436127235725400025130510230612034601230460103460713047013047010234070123"
		}
	}
}
{
	"Event": {
		"xmlns": "http://schemas.microsoft.com/win/2004/08/events/event",
		"System": {
			"Provider": {
				"Name": "MSSQLSERVER"
			},
			"EventID": {
				"text": "18453",
				"Qualifiers": "16384"
			},
			"Level": "0",
			"Task": "4",
			"Keywords": "0xa0000000000000",
			"TimeCreated": {
				"SystemTime": "2022-06-24T15:50:01.779402300Z"
			},
			"EventRecordID": "6490211",
			"Channel": "Application",
			"Computer": "dc.domain.ru",
			"Security": {
				"UserID": "S-1-5-21-11111-22222-33333-44444"
			}
		},
		"EventData": {
			"Data": [
				"DOMAIN\\\\Svc",
				" [CLIENT: 111.111.111.111]"
			],
			"Binary": "436127235725400025130510230612034601230460103460713047013047010234070123"
		}
	}
}`;

    const formattedTestCode = TestHelper.compressJsonRawEvents(rawEventsFromSIEM);

    const lines = formattedTestCode.split('\n');
    assert.strictEqual(lines.length, 2);
  });
});
