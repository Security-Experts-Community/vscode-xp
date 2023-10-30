import { addRow } from "./addRow.js";

const _nameInputClassSelector = '.jqNameInput';
const _ruDescriptionClassSelector = '.jqRuDescription';
const _enDescriptionClassSelector = '.jqEnDescription';
const fillTypeIdSelector = '#jqTypeDropdown'
const vsCodeDataGridRowTagSelector = 'vscode-data-grid-row'
const rowNameInputParentClassSelector = '.jqRowNameInputParent'
const rowNameInputClassSelector = '.jqRowNameInput'
const rowDropdownParentClassSelector = '.jqRowDropdownParent'
const rowDropdownClassSelector = '.jqRowDropdown'
const idCheckboxParentClassSelector = '.jqIdCheckboxParent'
const idCheckboxClassSelector = '.jqIdCheckbox'
const nullableCheckboxParentClassSelector = '.jqNullableCheckboxParent';
const nullableCheckboxClassSelector = '.jqNullableCheckbox';

export let currentObjectId;

const _insertDataFromBackend = (data) => {
	const table = JSON.parse(data);

	currentObjectId = table.metainfo.objectId ?? '';

	$(_nameInputClassSelector).val(table.name ?? '');
	$(_ruDescriptionClassSelector).val(table.metainfo.ruDescription ?? '');
	$(_enDescriptionClassSelector).val(table.metainfo.enDescription ?? '');
	$(fillTypeIdSelector).val(table.fillType ?? '')

	if (table.fillType == 'CorrelationRule') {
		// логика вставки полей для правил корреляции
	} else if (table.fillType == 'EnrichmentRule') {
		// логика вставки полей для правил обогащения
	} else if (table.fillType == 'AssetGrid') {
		// логика вставки полей для репутационного списка
	}

	for (const tableFieldId in table.fields) {
		addRow()
		const addedRow = $(vsCodeDataGridRowTagSelector).last();
		const tableRowDataObject = table.fields[tableFieldId]

		const rowName = Object.keys(tableRowDataObject)[0];
		const rowPropsObject = Object.values(tableRowDataObject)[0];
		const rowNullable = rowPropsObject.nullable;
		const rowPrimaryKey = rowPropsObject.primaryKey;
		const rowType = rowPropsObject.type;

		// вставка названия
		$(addedRow)
			.children(rowNameInputParentClassSelector)
			.children(rowNameInputClassSelector)
			.val(rowName ?? '')

		// вставка типа данных
		$(addedRow)
			.children(rowDropdownParentClassSelector)
			.children(rowDropdownClassSelector)
			.val(rowType ?? 'String')

		// вставка ключевого поля, тригерит обработку поля "индексируемое", поэтому мы не устанавливаем его из пришедших данных
		$(addedRow)
			.children(idCheckboxParentClassSelector)
			.children(idCheckboxClassSelector)
			.attr({ 'current-checked': rowPrimaryKey ?? false })

		// вставка nullable
		$(addedRow)
			.children(nullableCheckboxParentClassSelector)
			.children(nullableCheckboxClassSelector)
			.attr({ 'current-checked': rowNullable ?? false })
	}

}

const _insertDefaultValues = () => {
	// вставка стандартных данных
	currentObjectId = '';

	// вставка строки с таблицу с ключевым и индексируемым полями
	addRow();
	const addedRow = $(vsCodeDataGridRowTagSelector).last();

	// вставка ключевого поля, тригерит обработку поля "индексируемое", поэтому мы не устанавливаем его из пришедших данных
	$(addedRow)
		.children(idCheckboxParentClassSelector)
		.children(idCheckboxClassSelector)
		.attr({ 'current-checked': "true" })
}

export const insertDataToWebview = (data) => {
	(data == null) ? _insertDefaultValues() : _insertDataFromBackend(data);
}