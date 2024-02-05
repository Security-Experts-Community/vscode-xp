import { addRow } from "./addRow.js";
import { enableOrDisableTimeInputs, insertTleRows } from "./dropdownTypeSelectBehavior.js";

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

export const idRecordSizeTypicalInputIdSelector = '#jqRecordSizeTypicalInput';
export const idRecordSizeMaxInputIdSelector = '#jqRecordSizeMaxInput';
const timeDayInputClassSelector = '.jqTimeDayInput';
const timeHourInputClassSelector = '.jqTimeHourInput';
const timeMinuteInputClassSelector = '.jqTimeMinuteInput';
const timeSwitchIdSelector = '#jqTimeSwitch';

export let currentObjectId;
export let table;

const _insertDataFromBackend = (data) => {
	table = JSON.parse(data);
	console.log(table);


	currentObjectId = table.metainfo?.objectId ?? '';

	$(_nameInputClassSelector).val(table.name ?? '');
	$(_ruDescriptionClassSelector).val(table.metainfo?.ruDescription ?? '');
	$(_enDescriptionClassSelector).val(table.metainfo?.enDescription ?? '');
	$(fillTypeIdSelector).val(table.fillType ?? '')

	if (table.fillType == 'CorrelationRule' || table.fillType == 'EnrichmentRule') {
		// логика вставки полей для правил корреляции
		insertTleRows(table.fillType);
		
		// вставка максимального и типичного значений
		$(idRecordSizeTypicalInputIdSelector).val(table.typicalSize ?? '');
		$(idRecordSizeMaxInputIdSelector).val(table.maxSize ?? '');

		// включения свитчера времени и вставка времени
		if (table.ttl !== 0) {
			$(timeSwitchIdSelector).trigger('change');
			enableOrDisableTimeInputs(true)

			const days = Math.floor(table.ttl / (3600*24));
			const hours = Math.floor(table.ttl % (3600*24) / 3600);
			const minutes = Math.floor(table.ttl % 3600 / 60);

			$(timeDayInputClassSelector).val(days ?? 0);
			$(timeHourInputClassSelector).val(hours ?? 0);
			$(timeMinuteInputClassSelector).val(minutes ?? 0);
		}

	} else if (table.fillType == 'AssetGrid') {
		// логика вставки полей для репутационного списка
		// insertTleRows(table.fillType);
	}

	if (!table.fields) {
		// вставка строки с таблицу с ключевым и индексируемым полями
		addRow();
		const addedRow = $(vsCodeDataGridRowTagSelector).last();

		// вставка ключевого поля, тригерит обработку поля "индексируемое", поэтому мы не устанавливаем его из пришедших данных
		$(addedRow)
			.children(idCheckboxParentClassSelector)
			.children(idCheckboxClassSelector)
			.attr({ 'current-checked': "true" })
	} else {
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