const vscode = acquireVsCodeApi();

document.querySelector("body").addEventListener("keyup", event => {
	if (event.key !== "Enter") return;
	saveMetaInfo();
	event.preventDefault();
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
			console.log("Ошибка получения провайдера.")
			return;
		}
		const providerName = providerElement.value;

		const eventIdsElement = ds.querySelector("[name='eventID']");
		if (!eventIdsElement) {
			console.log("Ошибка получения списка EventID.")
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
			console.log("Ошибка получения провайдера.")
			return;
		}
		const tacticName = tacticElement.value;

		const techniquesIdsElement = ds.querySelector("[name='techniques']");
		if (!techniquesIdsElement) {
			console.log("Ошибка получения списка EventID.")
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
		command: 'saveMetaInfo',
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
		console.log(e.keyCode);
		e.preventDefault();
		saveMetaInfo();
	}
});

function inputsNameToArray(name) {
	const elements = [...document.getElementsByName(name)];
	return elements.map(u => u.value);
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
	}

	newDiv.appendChild(newField);
	newDiv.appendChild(deleteButton);

	button.parentNode.insertBefore(newDiv, button);
	newField.focus();
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
	}

	$(`[name="${a}"]`).first().clone(true, true).appendTo(dropdownGroupDiv)
	dropdownGroupDiv.appendChild(inputField)

	complexDiv.appendChild(dropdownGroupDiv);
	complexDiv.appendChild(deleteButton);
	const simpleDiv = document.createElement('div');
	simpleDiv.appendChild(complexDiv);

	button.parentElement.insertBefore(simpleDiv, button)
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