const _inputSelector = '.jqInput';
const _inputInvalidSelector = '.jqInput_invalid';
const _inputInvalidClass = 'jqInput_invalid';
const _timeInputClassSelector = ".jqTimeInput"
const _jqIdCheckboxClassSelector = ".jqIdCheckbox"
const _jqIdCheckboxClass = "jqIdCheckbox"
const _jqPrimaryFieldId = "#jqPrimaryField"

const _nameInputClass = 'jqNameInput';
const _rowNameInputClass = 'jqRowNameInput';
const _recordSizeInputClass = "jqRecordSizeInput"
const _timeDayInputClass = "jqTimeDayInput"
const _timeHourInputClass = "jqTimeHourInput"
const _timeMinuteInputClass = "jqTimeMinuteInput"
const _scoreInputClass = "jqScoreInput"

const _recordSizeInputUpperLimit = 2147483647;
const _timeDayInputUpperLimit = 90;
const _timeHourInputUpperLimit = 23;
const _timeMinuteInputUpperLimit = 59;
const _scoreInputUpperLimit = 100;
const _dgitalInputsLowerLimit = 0;

const _nameInputRegExp = new RegExp("^[a-zA-Z]($|[a-zA-Z0-9_]+$)");
const _rowNameInputRegExp = new RegExp("^[a-zA-Z]($|[a-zA-Z0-9_.]+$)");
const _onlyDigitalRegExp = new RegExp("^0|^[1-9][0-9]*$");

const _nameInputErrorMessageString = "Должно начинаться с латинской буквы, может содержать латинские буквы, цифры и символ подчеркивания.";
const _rowNameInputErrorMessageString = "Должно начинаться с латинской буквы, может содержать латинские буквы, цифры,символ подчеркивания и точку.";
const _recordSizeInputErrorMessageString = "Должно содержать только числа в диапазоне от 0 до 2147483647 включительно";
const _timeDayInputErrorMessageString = "Должно содержать только числа в диапазоне от 0 до 90 включительно";
const _timeHourInputErrorMessageString = "Должно содержать только числа в диапазоне от 0 до 23 включительно";
const _timeMinuteInputErrorMessageString = "Должно содержать только числа в диапазоне от 0 до 59 включительно";
const _scoreInputErrorMessageString = "Должно содержать только числа в диапазоне от 0 до 100 включительно";
const _timeInputsErrorMessageString = "Три поля не могут одновременно быть равны нулю";
const _notSelectedIdCheckboxErrorMessageString = "Должно быть выбрано хотя бы одно ключевое поле";


const _enableSaveButton = () => {
	$('#jqSaveButton')
		.removeAttr('disabled')
		.removeClass('disabled');
}

const _disableSaveButton = () => {
	$('#jqSaveButton')
		.attr({ 'disabled': 'true', 'aria-disabled': 'true' });
}

const _switchSaveButton = (isEnabled) => {
	isEnabled ? _enableSaveButton() : _disableSaveButton();
}

const _checkIfElementHasClass = (element, className) => $(element).hasClass(className);

const _addInvalidInputClass = (inputElement) => {
	if (!_checkIfElementHasClass(inputElement, _inputInvalidClass)) {
		$(inputElement).addClass(_inputInvalidClass)
	}
}

const _removeInvalidInputClass = (inputElement) => {
	if (_checkIfElementHasClass(inputElement, _inputInvalidClass)) {
		$(inputElement).removeClass(_inputInvalidClass)
	}
}

const _addValidCheckboxClass = (inputElement) => {
	if (!_checkIfElementHasClass(inputElement, 'jqIdCheckboxTrue')) {
		$(inputElement).addClass('jqIdCheckboxTrue')
	}
}

const _removeValidCheckboxClass = (inputElement) => {
	if (_checkIfElementHasClass(inputElement, 'jqIdCheckboxTrue')) {
		$(inputElement).removeClass('jqIdCheckboxTrue')
	}
}

const _addInvalidCheckboxClassForHighlight = (inputElement) => {
	if (!_checkIfElementHasClass(inputElement, 'jqIdCheckboxErrorHighlight')) {
		$(inputElement).addClass('jqIdCheckboxErrorHighlight')
	}
}

const _removeInvalidCheckboxClassForHighlight = (inputElement) => {
	if (_checkIfElementHasClass(inputElement, 'jqIdCheckboxErrorHighlight')) {
		$(inputElement).removeClass('jqIdCheckboxErrorHighlight')
	}
}

const _enableTooltipForInvalidElement = (inputElement, tooltipMessage) => {
	$(inputElement).tooltip({
		items: "vscode-text-field",
		content: tooltipMessage,
		show: false,
		hide: false,
		track: true
	}).tooltip("enable");

}

const _enableTooltipForIdCheckboxes = (checkboxElements, tooltipMessage) => {
	$(checkboxElements).tooltip({
		items: _jqPrimaryFieldId,
		content: tooltipMessage,
		show: false,
		hide: false,
		track: true
	}).tooltip("enable");

}

const _disableTooltipForInvalidElement = (inputElement) => {
	$(inputElement).tooltip("disable");
}

const _checkIfNumberInputValid = (inputElement, regExp, errorMessage, lowerLimit, upperLimit) => {
	let inputElementValue = $(inputElement).val()
	inputElementValue = inputElementValue.trim().replace(/[\s.,%;:!)(#@$^&*]/g, '')

	if ((Number(inputElementValue) || inputElementValue == '0') && typeof lowerLimit === 'number' && typeof upperLimit === 'number') {
		if (regExp.test(Number(inputElementValue)) && (Number(inputElementValue) >= Number(lowerLimit)) && (Number(inputElementValue) <= Number(upperLimit))) {
			_removeInvalidInputClass(inputElement);
			_disableTooltipForInvalidElement(inputElement);
		}
		else {
			_addInvalidInputClass(inputElement);
			_enableTooltipForInvalidElement(inputElement, errorMessage);
		};
		$(inputElement).val(Number(inputElementValue));
	}
	else {
		_addInvalidInputClass(inputElement);
		_enableTooltipForInvalidElement(inputElement, errorMessage);
		$(inputElement).val(inputElementValue);
	}

}

const _checkIfTextInputValid = (inputElement, regExp, errorMessage) => {
	if (regExp.test($(inputElement).val())) {
		_removeInvalidInputClass(inputElement);
		_disableTooltipForInvalidElement(inputElement);
	}
	else {
		_addInvalidInputClass(inputElement);
		_enableTooltipForInvalidElement(inputElement, errorMessage);
	};
}

const _checkIfCheckboxValid = (inputElement, errorMessage) => {
	if ($(inputElement)[0].checked) _addValidCheckboxClass(inputElement);
	else _removeValidCheckboxClass(inputElement);

	if (!($('.jqIdCheckboxTrue').length)) {
		_addInvalidCheckboxClassForHighlight(_jqPrimaryFieldId)
		_enableTooltipForIdCheckboxes(_jqPrimaryFieldId, errorMessage);
	}
	else {
		_removeInvalidCheckboxClassForHighlight(_jqPrimaryFieldId)
		_disableTooltipForInvalidElement(_jqPrimaryFieldId);
	}
	;
}

export const checkIfInvalidInputsExist = () => {
	if ($(_inputInvalidSelector).length || !($('.jqIdCheckboxTrue').length)) _switchSaveButton(false);
	else _switchSaveButton(true);
}

const _validateInputWithCheckingOfInputType = (inputElement) => {
	if (_checkIfElementHasClass(inputElement, _nameInputClass)) {
		_checkIfTextInputValid(inputElement, _nameInputRegExp, _nameInputErrorMessageString);
	}
	else if (_checkIfElementHasClass(inputElement, _rowNameInputClass)) {
		_checkIfTextInputValid(inputElement, _rowNameInputRegExp, _rowNameInputErrorMessageString);
	}
	else if (_checkIfElementHasClass(inputElement, _recordSizeInputClass)) {
		_checkIfNumberInputValid(inputElement, _onlyDigitalRegExp, _recordSizeInputErrorMessageString, _dgitalInputsLowerLimit, _recordSizeInputUpperLimit);
	} else if (_checkIfElementHasClass(inputElement, _timeDayInputClass)) {
		_checkIfNumberInputValid(inputElement, _onlyDigitalRegExp, _timeDayInputErrorMessageString, _dgitalInputsLowerLimit, _timeDayInputUpperLimit);
	}
	else if (_checkIfElementHasClass(inputElement, _timeHourInputClass)) {
		_checkIfNumberInputValid(inputElement, _onlyDigitalRegExp, _timeHourInputErrorMessageString, _dgitalInputsLowerLimit, _timeHourInputUpperLimit);
	}
	else if (_checkIfElementHasClass(inputElement, _timeMinuteInputClass)) {
		_checkIfNumberInputValid(inputElement, _onlyDigitalRegExp, _timeMinuteInputErrorMessageString, _dgitalInputsLowerLimit, _timeMinuteInputUpperLimit);
	}
	else if (_checkIfElementHasClass(inputElement, _scoreInputClass)) {
		_checkIfNumberInputValid(inputElement, _onlyDigitalRegExp, _scoreInputErrorMessageString, _dgitalInputsLowerLimit, _scoreInputUpperLimit);
	}
	else if (_checkIfElementHasClass(inputElement, _jqIdCheckboxClass)) {
		_checkIfCheckboxValid(inputElement, _notSelectedIdCheckboxErrorMessageString);
	}
}

export const validateAllInputs = () => {
	$.each($(_inputSelector), function () {
		_validateInputWithCheckingOfInputType(this)
	})
	$.each($(_jqIdCheckboxClassSelector), function () {
		_validateInputWithCheckingOfInputType(this)
	})
	checkIfInvalidInputsExist()
}

export const validateInput = (currentInputElement) => {
	_validateInputWithCheckingOfInputType(currentInputElement)
	checkIfInvalidInputsExist()
}

const _addOnInputEventListenerToForm = () => {
	$('form')[0].addEventListener("input", (e) => {
		validateInput(e.target);
	})
}

const _addOnChangeEventListenerToForm = () => {
	$('form')[0].addEventListener("change", (e) => {
		validateInput(e.target);
	})
}

export const enableValidation = () => {
	_addOnInputEventListenerToForm();
	_addOnChangeEventListenerToForm();
	validateAllInputs();
}