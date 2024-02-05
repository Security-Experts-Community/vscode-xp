import { addEventListenerOnChangeToToggleSwitch } from "../../../shared/ui/toggleSwitch/js/toggleSwitch.js";
import { jqDropdownRulesTleRows, jqDropdownAssetGridTleRows } from "../store/htmlStore.js";
import { idRecordSizeMaxInputIdSelector, idRecordSizeTypicalInputIdSelector, table } from "./dataInsertionBehavior.js";
import { addSpinersToAssetGridFields, addSpinersToRulesFields, disableRulesFieldsSpiners, enableRulesFieldsSpiners } from "./spinnerBehavior.js";
import { checkIfInvalidInputsExist, validateAllInputs } from "./validation.js";

const _registryTypeString = 'Registry';
const _correlationRuleTypeString = 'CorrelationRule';
const _enrichmentRuleTypeString = 'EnrichmentRule';
const _assetGridTypeString = 'AssetGrid';

const _rowsToRemoveBeforeInsertNewClassSelector = '.jqDropdownRemoveBeforeInsert'
const _rowAfterWhichElementsAreInsertedClassSelector = '.jqDropdownInserter'
const _timeInputClassSelector = '.jqTimeInput';

const _typeDropdownIdSelector = '#jqTypeDropdown';
const _timeSwitchIdSelector = '#jqTimeSwitch'

let _lastSelectedType;

const _enableTimeInputsAndAddValidationClass = () => {
	$(_timeInputClassSelector)
		.removeAttr('disabled')
		.removeClass('disabled')
		.addClass('jqInput');
}

const _disableTimeInputsAndRemoveValidationClassAndRemoveInsertedValues = () => {
	$(_timeInputClassSelector)
		.attr({ 'disabled': 'true', 'aria-disabled': 'true' })
		.val('')
		.removeClass('jqInput')
		.removeClass('jqInput_invalid')
}

export const enableOrDisableTimeInputs = (isSwitchChecked) => {
	if (isSwitchChecked) {
		_enableTimeInputsAndAddValidationClass()
		enableRulesFieldsSpiners();
	} else {
		_disableTimeInputsAndRemoveValidationClassAndRemoveInsertedValues();
		disableRulesFieldsSpiners();
	}
	validateAllInputs();
}

const _addOnChangeEventListenerToTTimeSwitcher = () => {
	$(_timeSwitchIdSelector)[0].addEventListener("change", function () {
		enableOrDisableTimeInputs(this.hasAttribute('checked'));
	})
}

const _enableTimeSwitchAndTimeInputsBehavior = () => {
	addEventListenerOnChangeToToggleSwitch();
	enableOrDisableTimeInputs($(_timeSwitchIdSelector)[0].hasAttribute('checked'));
	_addOnChangeEventListenerToTTimeSwitcher();
}

const _removeTleRowsAndInsertNewIfNeeded = (elementToInsert) => {
	$(_rowsToRemoveBeforeInsertNewClassSelector).remove();
	if (elementToInsert || 0) $(_rowAfterWhichElementsAreInsertedClassSelector).after(elementToInsert);
}



export const insertTleRows = (currentTypeString) => {
	if (currentTypeString === _registryTypeString) {
		_removeTleRowsAndInsertNewIfNeeded();
	}
	else if ((currentTypeString == _correlationRuleTypeString && _lastSelectedType != _enrichmentRuleTypeString) || (currentTypeString == _enrichmentRuleTypeString && _lastSelectedType != _correlationRuleTypeString)) {
		_removeTleRowsAndInsertNewIfNeeded(jqDropdownRulesTleRows);
		addSpinersToRulesFields();
		_enableTimeSwitchAndTimeInputsBehavior();
	} else if (currentTypeString == _assetGridTypeString) {
		_removeTleRowsAndInsertNewIfNeeded(jqDropdownAssetGridTleRows);
		addSpinersToAssetGridFields();
	}

	validateAllInputs();
	_lastSelectedType = currentTypeString;
}

const _addOnChangeEventListenerToTypeDropdown = () => {
	$(_typeDropdownIdSelector)[0].addEventListener("change", function () {
		console.log(this.value)
		insertTleRows(this.value);

    if (!table.fillType) {
      // для нового табличного списка при смене типа списка подставялем значения по-умолчанию
      $(idRecordSizeTypicalInputIdSelector).val(table.typicalSize ?? "");
      $(idRecordSizeMaxInputIdSelector).val(table.maxSize ?? "");
      validateAllInputs();
    }
	})
}

export const enableSelectingTypeOnDropdown = () => {
	_lastSelectedType = $('#jqTypeDropdown').val()
	console.log(_lastSelectedType);
	insertTleRows(_lastSelectedType);
	_addOnChangeEventListenerToTypeDropdown();
}