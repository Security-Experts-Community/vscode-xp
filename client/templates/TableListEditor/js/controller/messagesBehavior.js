const vscode = acquireVsCodeApi();

const _messagesController = () => {
	window.addEventListener(
		'message',
		(e) => {
			const message = e.data;
			switch (message.command) {
				case 'setViewContent': {
					console.log(message.data)
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

export const enableMessagesControllerAndSetDataToHTML = () => {
	_messagesController();
	_sendMessageToBackendOnDocumentReady();

}