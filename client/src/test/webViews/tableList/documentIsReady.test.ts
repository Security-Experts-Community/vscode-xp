// import * as assert from 'assert';
// import {expect, jest} from '@jest/globals';

// import { DocumentIsReadyCommand } from '../../../views/tableListsEditor/commands/documentIsReadyCommand';
// import { Table } from '../../../models/content/table';

// suite('DocumentIsReadyCommand', async () => {

// 	test('Отправка справочника на FE', async () => {

// 		const testTableList =
// `
// name: testTableList
// fillType: Registry
// type: 1
// userCanEditContent: false
// fields:
// - complex_key:
//     index: false
//     nullable: false
//     primaryKey: true
//     type: composite
//     unique: true
//     compositeFields:
//     - first_column
//     - second_column
// - first_column:
//     index: false
//     nullable: false
//     primaryKey: false
//     type: String
//     unique: false
// - second_column:
//     index: true
//     nullable: true
//     primaryKey: false
//     type: String
//     unique: false
// - third_column:
//     index: false
//     nullable: true
//     primaryKey: false
//     type: String
//     unique: false
// defaults:
//   LOC:
//   - first_column: first
//     second_column: second
//     third_column: third
// `;
// 		// Мочим таблицу для получения кода табличного списка без чтения файла.
// 		const table = new Table("testTable");
// 		jest.spyOn(table, 'getRuleCode').mockImplementation(async () => testTableList);
// 		const tableInfo = table.getRuleCode();

// 		const command = new DocumentIsReadyCommand(table);
// 		// command.processMessage({
// 		// 	"command" : DocumentIsReadyCommand.commandName
// 		// });

// 		// const webViewMock : WebViewBase = {
// 		// 	postMessage: jest.fn(async (message: TableListMessage) => {return true;})
// 		// };
// 	});
// });
