import { tableRow } from '../store/htmlStore.js';
import { addOnClickEventListenerToRemoveRowButton } from './removeRow.js'
// import { addSortableJQueryUIToDraggableRow } from './moveRow.js'

/** 
 * Функция добавляющая колонку в data-grid vscode-webview-ui-toolkit в TableListEditor.html
 */
const _addRow = () => {
	$('vscode-data-grid').append(tableRow);
	addOnClickEventListenerToRemoveRowButton($('vscode-data-grid').children().last().children('.remove-row-button'));
}

/**  
 * Функция, добавляющая прослушиватель событий на кнопку "Добавить колонку",
 * запускающий при клике на кнопку "Добавить колонку" выполнение функции добавления колонки _addColumn()
 * 
 * (в этом вебвью прослушивание событий добавляется только со стороны js, не в html).
 */
export const addOnClickEventListenerToAddRowButton = () => {
	$('#addRowButton')[0].addEventListener("click", (e) => {
		e.stopPropagation();
		_addRow();
	});
}