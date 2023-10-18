/** 
 * Функция, удаляющая родителя кнопки "🗑️": колонку из data-grid vscode-webview-ui-toolkit,
 * в которой находится эта кнопка.
 * @param {JQuery<HTMLElement>} buttonElement - кнопка удаления
 */
const _removeRow = (buttonElement) => {
	$(buttonElement).parent().remove();
}

/** 
 * Функция, добавляющая прослушиватель событий на кнопку "🗑️", 
 * запускающий при клике на кнопку "🗑️" выполнение функции удаление колонки _removeColumn(buttonElement)
 * 
 * Эту функцию нужно использовать внутри addOnClickEventListenerToAllRemoveColumnButtons() или при создании новой колонки, так как 
 * html шаблон колонки не содержит прослушивания событий 
 * 
 * (в этом вебвью прослушивание событий добавляется только со стороны js, не в html).
 * @param {JQuery<HTMLElement>} buttonElement - кнопка удаления
 */
export const addOnClickEventListenerToRemoveRowButton = (buttonElement) => {
	$(buttonElement)[0].addEventListener("click", (e) => {
		e.stopPropagation();
		_removeRow(buttonElement);
	})
}

/** 
 * Функция, применяющая функцию addOnClickEventListenerToRemoveColumnButton()
 * на каждую кнопоку "🗑️" на вебвью при первой его загрузке.
 * 
 * Эту функцию нужно использовать только один раз после загрузки DOM.
 * @param {JQuery<HTMLElement>} buttonElement - кнопка удаления
 */
export const addOnClickEventListenerToAllRemoveRowButtons = () => {
	$.each($('.remove-row-button'), function (i) {
		addOnClickEventListenerToRemoveRowButton(this);
	})
}

