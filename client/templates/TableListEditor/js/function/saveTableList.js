import { sendMessageToBackendOnSaveTableList } from "../controller/messagesBehavior.js";
import { currentObjectId } from "./dataInsertionBehavior.js";

const nameInputClassSelector = '.jqNameInput';
const ruDescriptionClassSelector = '.jqRuDescription';
const enDescriptionClassSelector = '.jqEnDescription';
const fillTypeIdSelector = '#jqTypeDropdown'
const draggableRowClassSelector = '.draggable-row';
const rowNameInputParentClassSelector = '.jqRowNameInputParent'
const rowNameInputClassSelector = '.jqRowNameInput'
const rowDropdownParentClassSelector = '.jqRowDropdownParent'
const rowDropdownClassSelector = '.jqRowDropdown'
const idCheckboxParentClassSelector = '.jqIdCheckboxParent'
const idCheckboxClassSelector = '.jqIdCheckbox'
const nullableCheckboxParentClassSelector = '.jqNullableCheckboxParent';
const nullableCheckboxClassSelector = '.jqNullableCheckbox';
const indexCheckboxParentClassSelector = '.jqIndexCheckboxParent';
const indexCheckboxClassSelector = '.jqIndexCheckbox';

const _saveTableList = () => {
	const defaultType = 1;
	const defaultUserCanEditContent = true;

	const data = {};

	data.type = defaultType;
	data.userCanEditContent = defaultUserCanEditContent;
	data.name = $(nameInputClassSelector).val();
	data.fillType = $(fillTypeIdSelector).val();

	data.metainfo = {};
	data.metainfo.objectId = currentObjectId;
	data.metainfo.ruDescription = $(ruDescriptionClassSelector).val();
	data.metainfo.enDescription = $(enDescriptionClassSelector).val();

	data.fields = [];
	$(draggableRowClassSelector).each(function () {
		const rowObject = {}

		// парсим имя
		const rowObjectNameKey = $(this).children(rowNameInputParentClassSelector).children(rowNameInputClassSelector).val()

		const rowObjectNameValues = {};

		// парсим тип
		rowObjectNameValues.type = $(this).children(rowDropdownParentClassSelector).children(rowDropdownClassSelector).val()

		//парсим ключевое поле
		rowObjectNameValues.primaryKey = $(this).children(idCheckboxParentClassSelector).children(idCheckboxClassSelector).attr("current-checked");

		//парсим индексируемое
		rowObjectNameValues.index = $(this).children(indexCheckboxParentClassSelector).children(indexCheckboxClassSelector).attr("current-checked");

		//парсим nullable
		rowObjectNameValues.nullable = $(this).children(nullableCheckboxParentClassSelector).children(nullableCheckboxClassSelector).attr("current-checked");

		// формируем итоговый объект для строки
		rowObject[rowObjectNameKey] = rowObjectNameValues;

		// добавляем итоговый объект в массив fields
		data.fields.push(rowObject);
	})

	sendMessageToBackendOnSaveTableList(JSON.stringify(data));
}

export const addOnClickEventListenerToSaveButton = () => {
	$('#jqSaveButton')[0].addEventListener("click", (e) => {
		_saveTableList();
	});
}