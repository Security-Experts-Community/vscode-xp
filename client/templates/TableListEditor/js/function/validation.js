const _inputSelector = '.jqInput';
const _inputInvalidSelector = '.jqInput_invalid';
const _inputInvalidClass = 'jqInput_invalid';

const _nameInputClass = 'jqNameInput';
const _rowNameInputClass = 'jqRowNameInput';

const _nameInputRegExp = new RegExp("[A-Z][a-zA-Z0-9_]+");
const _rowNameInputRegExp = new RegExp("[A-Z][a-zA-Z0-9_.]+");

const _nameInputErrorMessageString = "Должно начинаться с заглавной латинской буквы, может содержать латинские буквы, цифры и символ подчеркивания.";
const _rowNameInputErrorMessageString = "Должно начинаться с заглавной латинской буквы, может содержать латинские буквы, цифры,символ подчеркивания и точку.";


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

const _enableTooltipForInvalidElement = (inputElement, tooltipMessage) => {
	$(inputElement).tooltip({
		items: "vscode-text-field",
		content: tooltipMessage,
		show: false,
		hide: false,
		track: true
	}).tooltip("enable");

}

const _disableTooltipForInvalidElement = (inputElement) => {
	$(inputElement).tooltip("disable");

}

const _checkIfInputValid = (inputElement, regExp, errorMessage) => {
	if (regExp.test($(inputElement).val())) {
		_removeInvalidInputClass(inputElement)
		_disableTooltipForInvalidElement(inputElement)
	}
	else {
		_addInvalidInputClass(inputElement);
		_enableTooltipForInvalidElement(inputElement, errorMessage)
	};
}

export const checkIfInvalidInputsExist = () => {
	if ($(_inputInvalidSelector).length) _switchSaveButton(false)
	else _switchSaveButton(true)
}

const _validateInputWithCheckingOfInputType = (inputElement) => {
	if (_checkIfElementHasClass(inputElement, _nameInputClass)) {
		_checkIfInputValid(inputElement, _nameInputRegExp, _nameInputErrorMessageString)
	}
	else if (_checkIfElementHasClass(inputElement, _rowNameInputClass)) {
		_checkIfInputValid(inputElement, _rowNameInputRegExp, _rowNameInputErrorMessageString)
	}
}

const _validateAllInputs = () => {
	$.each($(_inputSelector), function () {
		_validateInputWithCheckingOfInputType(this)
	})
	checkIfInvalidInputsExist()
}

export const validateInput = (currentInputElement) => {
	_validateInputWithCheckingOfInputType(currentInputElement)
	checkIfInvalidInputsExist()
}

const _addOnKeyUpEventListenerToForm = () => {
	$('form')[0].addEventListener("keyup", (e) => {
		validateInput(e.target);
	})
}

const _addOnChangeEventListenerToForm = () => {
	$('form')[0].addEventListener("change", (e) => {
		validateInput(e.target);
	})
}

export const enableValidation = () => {
	_addOnKeyUpEventListenerToForm();
	_addOnChangeEventListenerToForm();
	_validateAllInputs();
}

