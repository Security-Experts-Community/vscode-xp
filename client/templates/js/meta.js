const vscode = acquireVsCodeApi();

const MULTILINE_INPUT_CLASSNAME = 'multiline-input';
const MULTILINE_INPUT_INVALID_CLASSNAME = 'multiline-input_invalid';

document.addEventListener('DOMContentLoaded', function () {
	populateMultilineInputs();

	this.addEventListener("keyup", (e) => {
		const closestEditableNode = e.target.closest(`.${MULTILINE_INPUT_CLASSNAME}`);
		if (closestEditableNode && checkIfNodeContentEditable(closestEditableNode)) {
			validateMultilineInput(closestEditableNode);
			e.stopImmediatePropagation();
		}
	});

	this.addEventListener("keyup", (e) => {
		if (e.key !== "Enter") {
			return;
		}

		saveMetaInfo();
		e.preventDefault();
	});
});

function saveMetaInfo() {

	const newName = document.getElementById("name")?.value;
	const newObjectId = document.getElementById("ObjectId")?.value;
	const newCreated = document.getElementById("Created")?.value;
	const newUpdated = document.getElementById("Updated")?.value;

	const usecases = inputsNameToArray("usecase");
	const knowledgeHolders = inputsNameToArray("knowledgeHolder");
	const falsepositives = inputsNameToArray("falsepositive");
	const improvements = inputsNameToArray("improvement");

	const references = inputsNameToArray("reference");

	// Получаем источники данных
	const dataSourceElements = Array.from(document.getElementsByName('dataSource'));

	var dataSourcesAsDict = {};
	dataSourceElements.map(ds => {
		const providerElement = ds.querySelector("[name='provider']");
		if (!providerElement) {
			console.log("Ошибка получения провайдера.");
			return;
		}
		const providerName = providerElement.value;

		const eventIdsElement = ds.querySelector("[name='eventID']");
		if (!eventIdsElement) {
			console.log("Ошибка получения списка EventID.");
			return;
		}
		const eventIdString = eventIdsElement.value;
		const eventIds = eventIdString.split(',').map(eid => eid.trim());

		if (!(providerName in dataSourcesAsDict)) {
			dataSourcesAsDict[providerName] = [];
		}

		dataSourcesAsDict[providerName] = dataSourcesAsDict[providerName].concat(eventIds);
	});

	var dataSources = [];
	for (var k in dataSourcesAsDict) {
		dataSources.push({ 'Provider': k, 'EventID': dataSourcesAsDict[k] });
	}

	// Преобразум атаки по MITRE.
	const attackElements = Array.from(document.getElementsByName('attack'));

	var attackAsDict = {};
	attackElements.map(ds => {
		const tacticElement = ds.querySelector("[name='tactic']");
		if (!tacticElement) {
			console.log("Ошибка получения провайдера.");
			return;
		}
		const tacticName = tacticElement.value;

		const techniquesIdsElement = ds.querySelector("[name='techniques']");
		if (!techniquesIdsElement) {
			console.log("Ошибка получения списка EventID.");
			return;
		}
		const techniquesIdsString = techniquesIdsElement.value;
		const techniques = techniquesIdsString.split(',').map(eid => eid.trim());

		if (!(tacticName in attackAsDict)) {
			attackAsDict[tacticName] = [];
		}

		attackAsDict[tacticName] = attackAsDict[tacticName].concat(techniques);
	});

	/* Сконвертируем полученные пары тактик\техник в такой список
	[
		{'Tactic': 'initial_access', 'Techniques': ['t123', 't124'...]}, 
		{'Tactic': 'persistence', 'Techniques': ['t125']}, 
		...
	] */
	var attacks = [];
	for (var k in attackAsDict) {
		attacks.push({ "Tactic": k, "Techniques": attackAsDict[k] });
	}


	vscode.postMessage({
		command: 'MetaInfoEditor.saveMetaInfo',
		metainfo: {
			'Name': newName,
			'ObjectId': newObjectId,
			'Created': newCreated,
			'Updated': newUpdated,

			'Usecases': usecases,
			'KnowledgeHolders': knowledgeHolders,
			'Falsepositives': falsepositives,
			'Improvements': improvements,
			'References': references,

			'DataSources': dataSources,
			'ATTACK': attacks,
		}
	});
}

// Сохраняем все тесты по хот кею Ctrl+S
$(document).on("keydown", e => {
	if (e.ctrlKey && e.code == 'KeyS') {
		e.preventDefault();
		saveMetaInfo();
	}
});

function inputsNameToArray(name) {
	return [].map.call(document.getElementsByName(name), (node) => {
		if (checkIfNodeContentEditable(node)) {
			return convertHTMLToText(node.innerHTML);
		}
		return node.value;
	});
}

function addValue(button, name) {
	const newDiv = document.createElement('div');

	const newField = document.createElement('input');
	if (name == "reference") {
		newField.type = 'url';
	} else {
		newField.type = 'text';
	}
	newField.name = name;
	newField.required = true;

	const deleteButton = document.createElement('input');
	deleteButton.type = 'button';
	deleteButton.value = '-';
	deleteButton.classList.add("delete");
	deleteButton.onclick = function () {
		deleteButton.parentNode.remove();
	};

	newDiv.appendChild(newField);
	newDiv.appendChild(deleteButton);

	button.parentNode.insertBefore(newDiv, button);
	newField.focus();
}

function addMultilineValue(addButton, fieldName) {
	addButton.insertAdjacentHTML('beforeBegin', `
		<div>
			<div class="${MULTILINE_INPUT_CLASSNAME}" name="${fieldName}" type="text" contenteditable="plaintext-only"></div>
			<input class="delete" type="button" value="-" onclick="deleteValue(this)">
		</div>
	`);

	const inputNode = addButton.parentNode.querySelector(
		`:scope > div:last-of-type .${MULTILINE_INPUT_CLASSNAME}`
	);

	if (inputNode) {
		inputNode.focus();
		validateMultilineInput(inputNode);
	}
}

function validateMultilineInput(node) {
	node.classList[node.textContent.trim() ? 'remove' : 'add'](MULTILINE_INPUT_INVALID_CLASSNAME);
}

function addComplexValue(button, type) {
	var name = "";
	if (type == "dataSource" || type == "attack") name = type;

	var a = name == "dataSource" ? "provider" : "tactic";
	var b = a + "s";
	var c = name == "dataSource" ? "eventID" : "techniques";

	const complexDiv = document.createElement('div');
	complexDiv.classList.add("complex");
	complexDiv.setAttribute("name", name);

	const dropdownGroupDiv = document.createElement('div');
	dropdownGroupDiv.classList.add("dropdown-group");

	// const newField1 = document.createElement('input');
	// newField1.type = 'text';
	// newField1.required = true;
	// newField1.name = a;
	// newField1.setAttribute('list', b);

	const inputField = document.createElement('input');
	inputField.required = true;
	inputField.type = 'text';
	inputField.name = c;

	const deleteButton = document.createElement('input');
	deleteButton.type = 'button';
	deleteButton.value = '-';
	deleteButton.classList.add("delete");
	deleteButton.onclick = function () {
		deleteButton.parentNode.remove();
	};

	$(`[name="${a}"]`).first().clone(true, true).appendTo(dropdownGroupDiv);
	dropdownGroupDiv.appendChild(inputField);

	complexDiv.appendChild(dropdownGroupDiv);
	complexDiv.appendChild(deleteButton);
	const simpleDiv = document.createElement('div');
	simpleDiv.appendChild(complexDiv);

	button.parentElement.insertBefore(simpleDiv, button);
	newField1.focus();
}

function addAttackComplexValue(button) {
	addComplexValue(button, "attack");
}

function addDataSourceComplexValue(button) {
	addComplexValue(button, "dataSource");
}

function deleteValue(button) {
	button.parentNode.remove();
}

function populateMultilineInputs() {
	document.querySelectorAll(`.${MULTILINE_INPUT_CLASSNAME}`)?.forEach((node) => {
		const { value: inputValue } = node.dataset;

		if (inputValue) {
			delete node.dataset.value;
			node.innerHTML = convertTextToHTML(inputValue);
		}
	});
}

function convertHTMLToText(html) {
	return html
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/\t/g, '    ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&');
}

function convertTextToHTML(textString) {
	return textString
		.replace(/&/g, '&amp;')
		// Меняем на &nbsp; только два пробела и более, иначе неправильно переносятся слова
		.replace(/[ ]{2,}/g, (spaces) => '&nbsp;'.repeat(spaces.length))
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/\r\n|\n/g, '<br>');
}

function checkIfNodeContentEditable(node) {
	const contentEditableAttribute = node.getAttribute('contenteditable');
	return contentEditableAttribute != null && contentEditableAttribute != 'false';
}
