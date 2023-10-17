import { tableColumn } from '../store/htmlStore.js';

/** 
 * Функция добавления колонки к data-grid из vscode webview ui toolkit в TableListEditor.html
 */
const _addColumn = () => {
	$('vscode-data-grid').append(tableColumn);
}

/**  
 * Функция, запускающая при клике на кнопку с id addColumnButton выполнение функции добавления колонки _addColumn()
 */
export const addEventListenerToAddColumnButton = () => {
	$('#addColumnButton')[0].addEventListener("click", (e) => {
		e.stopPropagation()
		_addColumn()
	});
}