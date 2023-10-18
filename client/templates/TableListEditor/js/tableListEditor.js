import { addOnClickEventListenerToAddColumnButton } from './function/addColumn.js';
import { addOnDragStartAndOverEventListenerToVsCodeDataGridRows } from './function/moveColumn.js';
import { addOnClickEventListenerToAllRemoveColumnButtons } from './function/removeColumn.js'

$(function () {
	addOnClickEventListenerToAddColumnButton();
	addOnClickEventListenerToAllRemoveColumnButtons();
	addOnDragStartAndOverEventListenerToVsCodeDataGridRows();
});