import { addOnClickEventListenerToAddRowButton } from './function/addRow.js';
import { addOnDragStartAndOverEventListenerToAllRows } from './function/moveRow.js';
import { addOnClickEventListenerToAllRemoveRowButtons } from './function/removeRow.js'

$(function () {
	addOnClickEventListenerToAddRowButton();
	addOnClickEventListenerToAllRemoveRowButtons();
	addOnDragStartAndOverEventListenerToAllRows();
});