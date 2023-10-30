import { addOnClickEventListenerToAddRowButton } from './function/addRow.js';
import { makeRowsSortableTakingIntoDynamicallyAddedRows } from './function/moveRow.js';
import { addOnClickEventListenerToAllRemoveRowButtons } from './function/removeRow.js'
import { addOnChangeEventListenerToAllIdCheckboxes } from './function/checkboxesBehavior.js';
import { enableValidation } from './function/validation.js';
import { enableSelectingTypeOnDropdown } from './function/dropdownTypeSelectBehavior.js';
import { enableMessagesController } from './controller/messagesBehavior.js';

$(function () {
	// наполняем содержимое логикой
	addOnClickEventListenerToAddRowButton();
	addOnClickEventListenerToAllRemoveRowButtons();
	makeRowsSortableTakingIntoDynamicallyAddedRows();
	addOnChangeEventListenerToAllIdCheckboxes();
	enableSelectingTypeOnDropdown();

	// подгружаем данные с бекенда и устанавливаем в html и после вставки включаем валидацию
	enableMessagesController();
});