import { addEventListenerOnChangeToToggleSwitch } from "../../../shared/ui/toggleSwitch/js/toggleSwitch.js";
import { jqDropdownRulesTleRows, jqDropdownListTleRows } from "../store/htmlStore.js";
import { checkIfInvalidInputsExist } from "./validation.js";

const _directoryTypeString = 'Справочник';
const _rulesCorrelationTypeString = 'Заполняется правилами корреляции';
const _rulesEnrichmentTypeString = 'Заполняется правилами обогащения';
const _listTypeString = 'Репутационный список';

const _rowsToRemoveBeforeInsertNewClassSelector = '.jqDropdownRemoveBeforeInsert'
const _rowAfterWhichElementsAreInsertedClassSelector = '.jqDropdownInserter'
const _timeInputClassSelector = '.jqTimeInput';

const _typeDropdownIdSelector = '#jqTypeDropdown';
const _timeSwitchIdSelector = '#jqTimeSwitch'

let _lastSelectedType;

const _enableTimeInputs = () => {
	$(_timeInputClassSelector)
		.removeAttr('disabled')
		.removeClass('disabled');
}

const _disableTimeInputsAndRemoveInsertedValues = () => {
	$(_timeInputClassSelector)
		.attr({ 'disabled': 'true', 'aria-disabled': 'true' })
		.val('')
}

const _enableOrDisableTimeInputs = (isSwitchChecked) => {
	isSwitchChecked ? _enableTimeInputs() : _disableTimeInputsAndRemoveInsertedValues();
}

const _addOnChangeEventListenerToTTimeSwitcher = () => {
	$(_timeSwitchIdSelector)[0].addEventListener("change", function () {
		console.log(this);
		_enableOrDisableTimeInputs(this.hasAttribute('checked'));
	})
}

const _enableTimeSwitchAndTimeInputsBehavior = () => {
	addEventListenerOnChangeToToggleSwitch();
	_enableOrDisableTimeInputs($(_timeSwitchIdSelector)[0].hasAttribute('checked'));
	_addOnChangeEventListenerToTTimeSwitcher();
}

const _removeTleRowsAndInsertNewIfNeeded = (elementToInsert) => {
	$(_rowsToRemoveBeforeInsertNewClassSelector).remove();
	if (elementToInsert || 0) $(_rowAfterWhichElementsAreInsertedClassSelector).after(elementToInsert);
}

const _insertTleRows = (currentTypeString) => {
	if (currentTypeString === _directoryTypeString) {
		_removeTleRowsAndInsertNewIfNeeded();
	}
	else if ((currentTypeString == _rulesCorrelationTypeString && _lastSelectedType != _rulesEnrichmentTypeString) || (currentTypeString == _rulesEnrichmentTypeString && _lastSelectedType != _rulesCorrelationTypeString)) {
		_removeTleRowsAndInsertNewIfNeeded(jqDropdownRulesTleRows);
		_enableTimeSwitchAndTimeInputsBehavior();
	} else if (currentTypeString == _listTypeString) {
		_removeTleRowsAndInsertNewIfNeeded(jqDropdownListTleRows);
	}

	_lastSelectedType = currentTypeString;
	checkIfInvalidInputsExist();
}

const _addOnChangeEventListenerToTypeDropdown = () => {
	$(_typeDropdownIdSelector)[0].addEventListener("change", function () {
		_insertTleRows(this.value);
	})
}

export const enableSelectingTypeOnDropdown = () => {
	_lastSelectedType = $('#jqTypeDropdown').val()
	_insertTleRows(_lastSelectedType);
	_addOnChangeEventListenerToTypeDropdown();
}