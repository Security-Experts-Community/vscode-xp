function update(text) {
	let result_element = document.querySelector("#highlighting-content");
	// Handle final newlines (see article)
	if(text[text.length-1] == "\n") {
		text += " ";
	}
	// Update code
	result_element.innerHTML = text.replace(new RegExp("&", "g"), "&amp;").replace(new RegExp("<", "g"), "&lt;"); /* Global RegExp */
	// Syntax Highlight
	Prism.highlightElement(result_element);	
}

function sync_scroll(element) {
	/* Scroll result to scroll coords of event - sync with textarea */
	let result_element = document.querySelector("#highlighting");
	// Get and set x and y
	result_element.scrollTop = element.scrollTop;
	result_element.scrollLeft = element.scrollLeft;
}

function check_tab(element, event) {
	let code = element.value;
	if(event.key == "Tab") {
		/* Tab key pressed */
		event.preventDefault(); // stop normal
		let before_tab = code.slice(0, element.selectionStart); // text before tab
		let after_tab = code.slice(element.selectionEnd, element.value.length); // text after tab
		let cursor_pos = element.selectionStart + 1; // where cursor moves after tab - moving forward by 1 char to after tab
		element.value = before_tab + "\t" + after_tab; // add tab char
		// move cursor
		element.selectionStart = cursor_pos;
		element.selectionEnd = cursor_pos;
		update(element.value); // Update text to include indent
	}
}

// word wrap/unwrap with button
function wrap(check) {
	const textField = check.parentNode.parentNode.children[2].children[0];
	if (textField.wrap == "off") {
		check.checked = true;
		textField.wrap = "on";
		textField.style.height = textField.scrollHeight + "px";
	} else {
		check.checked = false;
		textField.wrap = "off";
		//textField.focus();
	}
}

function toggleTextarea(arrow) {
	labels = arrow.parentNode.parentNode.children[1];
	txt = arrow.parentNode.parentNode.children[2];
	if (txt.hidden == true) {
		txt.hidden = false;
		labels.hidden = false;
		arrow.innerHTML = "ᐯ";
	} else {
		txt.hidden = true;
		labels.hidden = true;
		arrow.innerHTML = "❯";
	}
}

function toggleCode(arrow) {
	txt = arrow.parentNode.parentNode.children[1];
	if (txt.style.display == 'none') {
		txt.style.display = '';
		arrow.innerHTML = "ᐯ";
	} else {
		txt.style.display = 'none';
		arrow.innerHTML = "❯";
	}
}

var vscode = acquireVsCodeApi();

// Получение команд от расширения.
window.addEventListener(
	'message', 
	(event) => {
		const message = event.data; 
		switch (message.command) {
			case 'sendTestStatus': {
				const testStatus = message.testStatus;
				break;
			}
			case 'updateRawEvent': {
				const rawEvent = message.rawEvent;
				if(!rawEvent) {
					alert("Ошибка обновления сырых событий.");
					return;
				}
				
				// Задаем новое значение сырых событий.
				const baseTestElement = $("#main-body");
				baseTestElement.find('[name="raw_event"]').val(rawEvents);
				break;
			}
			case 'updateExpectation': {
				const expectation = message.expectation;
				if(!expectation) {
					alert("Ошибка обновления кода теста событий.");
					return;
				}
				const baseTestElement = "#main-body";
				baseTestElement.find('[name="expected"]').val(expectation);
				break;
			}
		}
});

$('textarea').on('focusin', function() {
	$(this).height(this.scrollHeight);
});

$(document).ready(function() {
	raws = $('[name=word-wrap]');
	for (i = 0; i < raws.length; i++) {
		wrap(raws[i]);
	}
	
	// Полный тест
	$(document).on("click",'#run_test', function () {	
		
		const baseTestElement = $("#main-body");
		const id = parseInt(baseTestElement.find('[name="test"]')[0].id);
		const rawEvent = baseTestElement.find('[name="raw-event"]').val();
		const expectation = baseTestElement.find('[name="expected"]').val();			

		vscode.postMessage({
			command: 'runTest',
			test: {
				"id": id,
				"rawEvent" : rawEvent,
				"expectation" : expectation,
			}
		});
	});

	// Сохраняем тест
	$(document).on("click",'#save_test', function () {

		// Получаем значения.	
		const baseTestElement = $("#main-body");
		const id = parseInt(baseTestElement.find('[name="test"]')[0].id);
		const rawEvent = baseTestElement.find('[name="raw-event"]').val();
		const expectation = baseTestElement.find('[name="expected"]').val();

		vscode.postMessage({
			command: 'saveTest',
			test: {
				"id": id,
				"rawEvent" : rawEvent,
				"expectation" : expectation,
			}
		});
	});
});
