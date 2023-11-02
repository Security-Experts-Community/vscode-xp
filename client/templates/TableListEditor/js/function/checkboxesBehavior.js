import { validateInput } from "./validation.js";

/** 
 * Функция, выбирающая все чекбоксы "Ключевое поле 🔑" кроме переданного checkboxElement и 
 * отключающая возможность изменения их состояния.
 * 
 * Эту функцию нужно использовать только когда у чекбокса "Ключевое поле 🔑" состояние
 * меняется с "не выбран" на "выбран", в функции в addOnChangeEventListenerToIdCheckbox().
 * @param {JQuery<HTMLElement>} idCheckboxElement - чекбокс "Ключевое поле 🔑" 
 * @deprecated с момента, когда логику переопределения ключевых полей отдали на бекенд
 */
const _makeAnotherIdCheckboxesDisabledWhenIdCheckboxIsChecked = (idCheckboxElement) => {
	$(".jqIdCheckbox")
		.not(idCheckboxElement)
		.attr({ 'disabled': 'true', 'aria-disabled': 'true' });
}

/** 
 * Функция, выбирающая все чекбоксы "Ключевое поле 🔑" кроме переданного checkboxElement и 
 * включающая возможность изменения их состояния.
 * 
 * Эту функцию нужно использовать только когда у чекбокса "Ключевое поле 🔑" состояние
 * меняется с "не выбран" на "выбран", в функции в addOnChangeEventListenerToIdCheckbox().
 * @param {JQuery<HTMLElement>} idCheckboxElement - чекбокс "Ключевое поле 🔑" 
 * @deprecated с момента, когда логику переопределения ключевых полей отдали на бекенд
 */
const _makeAnotherIdCheckboxesEnabledWhenIdCheckboxIsNotChecked = (idCheckboxElement) => {
	$('.jqIdCheckbox')
		.not(idCheckboxElement)
		.removeAttr('disabled')
		.removeClass('disabled');
}

/** 
 * Функция, выбирающая соседний в строке чекбокс "Индексируемое", меняющая его состояние на "выбран", 
 * при этом отключающая возможность изменения его состояния.
 * 
 * Эту функцию нужно использовать только когда у чекбокса "Ключевое поле 🔑" состояние
 * меняется с "не выбран" на "выбран", в функции в addOnChangeEventListenerToIdCheckbox().
 * @param {JQuery<HTMLElement>} idCheckboxElement - чекбокс "Ключевое поле 🔑" 
 */
const _makeSameRowIndexCheckboxCheckedAndDisabledWhenIdCheckboxIsChecked = (idCheckboxElement) => {
	$(idCheckboxElement)
		.parent('.jqIdCheckboxParent')
		.siblings('.jqIndexCheckboxParent')
		.children('.jqIndexCheckbox')
		.attr({ 'current-checked': 'true', 'disabled': 'true', 'aria-disabled': 'true' });
}

/** 
 * Функция, выбирающая соседний в строке чекбокс "Индексируемое" и 
 * включающая возможность изменения его состояния.
 * 
 * Эту функцию нужно использовать только когда у чекбокса "Ключевое поле 🔑" состояние
 * меняется с "выбран" на "не выбран", в функции в addOnChangeEventListenerToIdCheckbox().
 * @param {JQuery<HTMLElement>} idCheckboxElement - чекбокс "Ключевое поле 🔑" 
 */
const _makeSameRowIndexCheckboxEnabledWhenIdCheckboxIsNotChecked = (idCheckboxElement) => {
	$(idCheckboxElement)
		.parent('.jqIdCheckboxParent')
		.siblings('.jqIndexCheckboxParent')
		.children('.jqIndexCheckbox')
		.removeAttr('disabled')
		.removeClass('disabled');
}

/** 
 * Функция, отключающая возможность изменения состояния чекбокса "Ключевое поле 🔑" в создаваемой строке 
 * тогда и только тогда, когда существует другая строка с выбранным чекбоксом "Ключевое поле 🔑", ввиду чего у
 * всех остальных строк отключена возможность изменения состояния чекбокса "Ключевое поле 🔑".
 * 
 * Эту функцию нужно использовать только при добавлении строки в _addRow().
 * @param {JQuery<HTMLElement>} idCheckboxElement - чекбокс "Ключевое поле 🔑"
 * @deprecated с момента, когда логику переопределения ключевых полей отдали на бекенд 
 */
export const makeNewRowIdCheckboxDisabledIfAnyIdCheckboxIsChecked = (idCheckboxElement) => {
	if ($('.jqIdCheckbox.checked').length) {
		$(idCheckboxElement)
			.attr({ 'disabled': 'true', 'aria-disabled': 'true' });
	}
}

/** 
 * Функция, включающая возможность изменения состояния чекбоксов "Ключевое поле 🔑" из других строк, 
 * тогда и только тогда когда мы удаляем строку с выбранным чекбоксом "Ключевое поле 🔑".
 * 
 * Эту функцию нужно использовать только при удалении строки в _removeRow().
 * @param {JQuery<HTMLElement>} idCheckboxElement - чекбокс "Ключевое поле 🔑"
 * @deprecated с момента, когда логику переопределения ключевых полей отдали на бекенд
 */
export const makeDisabledIdCheckboxesEnabledWhenRemoveRowWithCheckedIdCheckbox = (idCheckboxElement) => {
	if ($(idCheckboxElement).hasClass('checked')) {
		$('.jqIdCheckbox')
			.removeAttr('disabled')
			.removeClass('disabled');
	}
}

/** 
 * Функция, добавляющая прослушиватель событий на чекбокс "Ключевое поле 🔑", 
 * запускающий при изменении состояния (выбран / не выбран) чекбокса "Ключевое поле 🔑" 
 * выполнение функций:
 * 
 * 1) Если чекбокс "Ключевое поле 🔑" меняет состояние на "выбран", запустит функцию 
 * _makeSameRowIndexCheckboxCheckedAndDisabledWhenIdCheckboxIsChecked(), которая выбирает соседний в строке 
 * чекбокс "Индексируемое" и отключает возможность изменения его состояния, а также запустит функцию
 * _makeAnotherIdCheckboxesDisabledWhenIdCheckboxIsChecked(), которая отключает возможность изменения 
 * состояния других чекбоксов "Ключевое поле 🔑".
 * 
 * 2) Если чекбокс "Ключевое поле 🔑" меняет состояние с "выбран" на "не выбран", запутит функцию
 * _makeSameRowIndexCheckboxEnabledWhenIdCheckboxIsNotChecked(), которая выбирает соседний в строке
 * чекбокс "Индексируемое" и включает возможность изменения его состояния, а также запустит функцию
 * _makeAnotherIdCheckboxesEnabledWhenIdCheckboxIsNotChecked(), которая включает возможность изменения 
 * состояния других чекбоксов "Ключевое поле 🔑".
 * 
 * Эту функцию нужно использовать внутри addOnChangeEventListenerToAllIdCheckboxes() или при создании новой колонки, так как 
 * html шаблон колонки не содержит прослушивания событий. 
 * 
 * (в этом вебвью прослушивание событий добавляется только со стороны js, не в html).
 * @param {JQuery<HTMLElement>} idCheckboxElement - чекбокс "Ключевое поле 🔑"
 */
export const addOnChangeEventListenerToIdCheckbox = (idCheckboxElement) => {
	$(idCheckboxElement)[0].addEventListener("change", () => {
		if (idCheckboxElement.checked) {
			_makeSameRowIndexCheckboxCheckedAndDisabledWhenIdCheckboxIsChecked(idCheckboxElement);
		} else {
			_makeSameRowIndexCheckboxEnabledWhenIdCheckboxIsNotChecked(idCheckboxElement);
		}
	})
}

/** 
 * Функция, применяющая функцию addOnChangeEventListenerToIdCheckbox()
 * на каждый чекбокс "Ключевое поле 🔑" на вебвью при первой его загрузке.
 * 
 * Эту функцию нужно использовать только один раз после загрузки DOM.
 */
export const addOnChangeEventListenerToAllIdCheckboxes = () => {
	$.each($('.jqIdCheckbox'), function () {
		addOnChangeEventListenerToIdCheckbox(this);
	})
}