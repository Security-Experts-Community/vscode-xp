import { tableColumn } from '../store/htmlStore.js';
import { addOnClickEventListenerToRemoveColumnButton } from './removeColumn.js'
import { addOnDragStartAndOverEventListenerToVsCodeDataGridRow } from './moveColumn.js'

/** 
 * Функция добавляющая колонку в data-grid vscode-webview-ui-toolkit в TableListEditor.html
 */
const _addColumn = () => {
	$('vscode-data-grid').append(tableColumn);
	addOnClickEventListenerToRemoveColumnButton($('vscode-data-grid').children().last().children('.remove-icon'));
	addOnDragStartAndOverEventListenerToVsCodeDataGridRow($('vscode-data-grid').children().last());
}

/**  
 * Функция, добавляющая прослушиватель событий на кнопку "Добавить колонку",
 * запускающий при клике на кнопку "Добавить колонку" выполнение функции добавления колонки _addColumn()
 * 
 * (в этом вебвью прослушивание событий добавляется только со стороны js, не в html).
 */
export const addOnClickEventListenerToAddColumnButton = () => {
	$('#addColumnButton')[0].addEventListener("click", (e) => {
		e.stopPropagation();
		_addColumn();
	});
}