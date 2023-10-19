import { addOnClickEventListenerToAddRowButton } from './function/addRow.js';
import { makeRowsSortableTakingIntoDynamicallyAddedRows } from './function/moveRow.js';
import { addOnClickEventListenerToAllRemoveRowButtons } from './function/removeRow.js'
import { addOnChangeEventListenerToAllIdCheckboxes } from './function/checkboxesBehavior.js';

$(function () {
	addOnClickEventListenerToAddRowButton();
	addOnClickEventListenerToAllRemoveRowButtons();
	makeRowsSortableTakingIntoDynamicallyAddedRows();
	addOnChangeEventListenerToAllIdCheckboxes();
});