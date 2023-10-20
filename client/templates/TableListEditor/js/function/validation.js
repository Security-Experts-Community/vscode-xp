const _enableSaveButton = () => {
	$('#jqSaveButton')
		.removeAttr('disabled')
		.removeClass('disabled');
}

const _disableSaveButton = () => {
	$('#jqSaveButton')
		.attr({ 'disabled': 'true', 'aria-disabled': 'true' });
}

export const switchSaveButton = (isEnabled) => {
	isEnabled ? _enableSaveButton() : _disableSaveButton();
}

const _elementHasClass = (element, className) => {
	return $(element).hasClass(className)
}

const invalidInputClass = 'jqInput_invalid'

const _addInvalidInputClass = (inputElement) => {
	if (!_elementHasClass(inputElement, invalidInputClass)) {
		$(inputElement).addClass(invalidInputClass)
	}
}

const _removeInvalidInputClass = (inputElement) => {
	if (_elementHasClass(inputElement, invalidInputClass)) {
		$(inputElement).removeClass(invalidInputClass)
	}
}

const _isInputValid = (inputElement, regExpString) => {
	const regExp = new RegExp(regExpString)
	if (regExp.test($(inputElement).val())) {
		_addInvalidInputClass(inputElement);
		return true;
	} else {
		_removeInvalidInputClass(inputElement);
		return false;
	}
}

const convertInputsThatNeedValidationArrayToValidStateObject = (inputsThatNeedValidationArray) => {
	let map = new Map();
	return inputsThatNeedValidationArray.reduce((obj, item) => {
		if (_elementHasClass(item, 'jqNameInput')) {
			return {
				map.set(item, _isInputValid(item, "[A-Z][a-zA-Z0-9_]+"));
			};
		} else if (_elementHasClass(item, 'jqRawNameInput')) {
			return {
				...obj,
				[item]: _isInputValid(item, "[A-Z][a-zA-Z0-9_.]+"),
			};
		}
	}, initialValue);
};

export let currentValidationObject = {}
export let isAllFieldsValid = true;

export const firstValidate = () => {
	const typeDropdownValue = $('#jqTypeDropdown').val()

	if (typeDropdownValue == 'Справочник') {
		const validationArray = $('.jqNameInput').toArray().concat($('jqRawNameInput').toArray())
		currentValidationObject = convertInputsThatNeedValidationArrayToValidStateObject(validationArray);
		Object.values(currentValidationObject).forEach((element) => {
			isAllFieldsValid = isAllFieldsValid && element;
		})
		switchSaveButton(isAllFieldsValid);
	}
}

export const liveValidate = (currentChangingElement) => {
	if (currentValidationObject.hasOwnProperty(currentChangingElement)) {
		if (_elementHasClass(item, 'jqNameInput')) {
			currentValidationObject[currentChangingElement] = _isInputValid(item, "[A-Z][a-zA-Z0-9_]+")
		} else if (_elementHasClass(item, 'jqRawNameInput')) {
			currentValidationObject[currentChangingElement] = _isInputValid(item, "[A-Z][a-zA-Z0-9_.]+")
		}
	} else {
		currentValidationObject.add
	}
	Object.values(currentValidationObject).forEach((element) => {
		isAllFieldsValid = isAllFieldsValid && element;
	})
	switchSaveButton(isAllFieldsValid);
}

export const addOnKeyUpEventListenerToForm = () => {
	$('form')[0].addEventListener("keyup", (e) => {
		// liveValidate()
	})
}

export const addOnChangeEventListenerToForm = () => {
	$('form')[0].addEventListener("change", (e) => {
		// liveValidate()
	})
}

