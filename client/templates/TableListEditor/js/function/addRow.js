import { tableRowHTML } from '../store/htmlStore.js';
import { addOnClickEventListenerToRemoveRowButton } from './removeRow.js'
import { addOnChangeEventListenerToIdCheckbox, makeNewRowIdCheckboxDisabledIfAnyIdCheckboxIsChecked } from './checkboxesBehavior.js'

/** 
 * Функция добавляющая строку в data-grid vscode-webview-ui-toolkit в TableListEditor.html
 */
const _addRow = () => {
	$('vscode-data-grid').append(tableRowHTML);

	const removeButtonElement = $('vscode-data-grid').children().last().children('.remove-row-button')[0]
	const idCheckboxElement = $('vscode-data-grid').children().last().children('.jqIdCheckboxParent').children('.jqIdCheckbox')[0];

	addOnClickEventListenerToRemoveRowButton(removeButtonElement);
	addOnChangeEventListenerToIdCheckbox(idCheckboxElement);
	makeNewRowIdCheckboxDisabledIfAnyIdCheckboxIsChecked(idCheckboxElement);
}

/**  
 * Функция, добавляющая прослушиватель событий на кнопку "Добавить строку",
 * запускающий при клике на кнопку "Добавить строку" выполнение функции добавления колонки _addColumn()
 * 
 * (в этом вебвью прослушивание событий добавляется только со стороны js, не в html).
 */
export const addOnClickEventListenerToAddRowButton = () => {
	$('#addRowButton')[0].addEventListener("click", (e) => {
		e.stopPropagation();
		_addRow();
	});
}