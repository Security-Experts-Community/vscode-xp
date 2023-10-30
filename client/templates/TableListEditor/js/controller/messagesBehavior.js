import { insertDataToWebview } from "../function/dataInsertionBehavior.js";
import { enableValidation } from "../function/validation.js";

const vscode = acquireVsCodeApi();
console.log(vscode)

const _messagesController = () => {
	window.addEventListener(
		'message',
		(e) => {
			const message = e.data;
			switch (message.command) {
				case 'setViewContent': {
					insertDataToWebview(message.data)

					// валидация должна включаться самой последней, после подгрузки всех нужных полей
					enableValidation();
					break;
				}
			}
		});
}

const _sendMessageToBackendOnDocumentReady = () => {
	vscode.postMessage({
		command: 'documentIsReady',
	});
}

export const sendMessageToBackendOnSaveTableList = (tableList) => {
	vscode.postMessage({
		command: 'saveTableList',
		data: tableList
	});
}

export const enableMessagesController = () => {
	_messagesController();
	_sendMessageToBackendOnDocumentReady();

}