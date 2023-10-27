import { addOnClickEventListenerToAddRowButton } from './function/addRow.js';
import { makeRowsSortableTakingIntoDynamicallyAddedRows } from './function/moveRow.js';
import { addOnClickEventListenerToAllRemoveRowButtons } from './function/removeRow.js'
import { addOnChangeEventListenerToAllIdCheckboxes } from './function/checkboxesBehavior.js';
import { enableValidation } from './function/validation.js';
import { enableSelectingTypeOnDropdown } from './function/dropdownTypeSelectBehavior.js';
import { enableMessagesControllerAndSetDataToHTML } from './controller/messagesBehavior.js';

$(function () {
	// подгружаем данные с бекенда и устанавливаем в html
	enableMessagesControllerAndSetDataToHTML();

	// наполняем содержимое логикой
	addOnClickEventListenerToAddRowButton();
	addOnClickEventListenerToAllRemoveRowButtons();
	makeRowsSortableTakingIntoDynamicallyAddedRows();
	addOnChangeEventListenerToAllIdCheckboxes();
	enableSelectingTypeOnDropdown();

	// валидация должна включаться самой последней, после подгрузки всех нужных полей
	enableValidation();
});