import * as assert from 'assert';
import { TestHelper } from '../../helpers/testHelper';

suite('testHelper.removeFieldsFromJsonl', async () => {

	test('Удаление поля body из трёх событий', async () => {

		const jsonl = 
`{"src.host": "::1", "src.ip": "::1", "body": "body content"}
{"src.host": "::1", "src.ip": "::1", "body": "body content"}
{"src.host": "::1", "src.ip": "::1", "body": "body content"}`;

		const actual = TestHelper.removeFieldsFromJsonl(jsonl, 'body');
		assert.strictEqual(
			actual, 
`{"src.host":"::1","src.ip":"::1"}\r\n{"src.host":"::1","src.ip":"::1"}\r\n{"src.host":"::1","src.ip":"::1"}`);
	});

	test('Удаление поля двух полей из одного события', async () => {

		const jsonl = 
`{"src.host": "::1", "src.ip": "::1", "recv_time": "recv_time", "time" : "time"}`;

		const actual = TestHelper.removeFieldsFromJsonl(jsonl, 'time', 'recv_time');
		assert.strictEqual(actual,
`{"src.host":"::1","src.ip":"::1"}`);
	});
});