import * as vscode from 'vscode';
import * as assert from 'assert';

import { activate, getDocUri, testCompletion } from '../../helper';

suite('Автодополнение для корреляций', () => {
	const docUri = getDocUri('completion.co');

	test('Наличие автодополнения в корреляциях', async () => {
		
		const completions = await testCompletion(docUri, new vscode.Position(0, 0));
		assert.ok(completions.items.length >= 0);
	});

	test('Наличие автодополнения функции div', async () => {
		const completions = await testCompletion(docUri, new vscode.Position(0, 0));
		const сompletion = completions.items.find( ci => ci.label === "div");
		assert.ok(сompletion);
	});

	test('Наличие ключевого слова query', async () => {
		const completions = await testCompletion(docUri, new vscode.Position(0, 0));
		const сompletion = completions.items.find( ci => ci.label === "query");
		assert.ok(сompletion);
	});

	test('Наличие поля таксономии event_src.host', async () => {
		const completions = await testCompletion(docUri, new vscode.Position(0, 0));
		const сompletion = completions.items.find( ci => ci.label === "event_src.host");
		assert.ok(сompletion);
	});
});

