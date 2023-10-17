import { addOnClickEventListenerToAddColumnButton } from './function/addColumn.js';
import { addOnClickEventListenerToAllRemoveColumnButtons } from './function/removeColumn.js'

$(function () {
	addOnClickEventListenerToAddColumnButton();
	addOnClickEventListenerToAllRemoveColumnButtons();
});