/** 
 * Константа, хранящая в себе шаблонную колонку для data-grid из vscode webview ui toolkit в TableListEditor.html
 * 
 * ВНИМАНИЕ: если происходит обновление vscode-data-grid-row в TableListEditor.html,
 * нужно обновить этот шаблон! Код из vscode-data-grid-row в TableListEditor.html 
 * должен совпадать с этим шаблоном!
 */
export const tableRowHTML = `
	<vscode-data-grid-row class="draggable-row">
    	<vscode-data-grid-cell grid-column="1" class="tle__row__table__cell-icon move-row-button">::::</vscode-data-grid-cell>
    	<vscode-data-grid-cell grid-column="2" class="jqRowNameInputParent">
			<vscode-text-field type="text" class="jqRowNameInput jqInput jqInput_invalid"></vscode-text-field>
		</vscode-data-grid-cell>
    	<vscode-data-grid-cell grid-column="3" class="jqRowDropdownParent">
			<vscode-dropdown class="jqRowDropdown">
  				<vscode-option value="String">Строка</vscode-option>
                <vscode-option value="Number">Число</vscode-option>
                <vscode-option value="DataTime">Дата и Время</vscode-option>
                <vscode-option value="Regex">Регулярное выражение</vscode-option>
			</vscode-dropdown>
		</vscode-data-grid-cell>
    	<vscode-data-grid-cell grid-column="4" class="jqIdCheckboxParent">
			<vscode-checkbox class="jqIdCheckbox"></vscode-checkbox>
		</vscode-data-grid-cell>
		<vscode-data-grid-cell grid-column="5" class="jqIndexCheckboxParent">
			<vscode-checkbox class="jqIndexCheckbox"></vscode-checkbox>
		</vscode-data-grid-cell>
    	<vscode-data-grid-cell grid-column="6" class="jqNullableCheckboxParent">
			<vscode-checkbox class="jqNullableCheckbox"></vscode-checkbox>
		</vscode-data-grid-cell>
		<vscode-data-grid-cell grid-column="7" class="tle__row__table__cell-icon remove-row-button">🗑️</vscode-data-grid-cell>
	</vscode-data-grid-row>
`;

export const jqDropdownRulesTleRows = `
	<div class="tle__row jqDropdownRulesTleRow jqDropdownRemoveBeforeInsert">
		<vscode-text-field type="text" class="jqRecordSizeInput jqInput">
			Типичный размер
			<span class="span_input-required">*</span>
		</vscode-text-field>
		<span class="tle__row__input__helper">Количество записей, которое нежелательно превышать.</span>
	</div>
	<div class="tle__row jqDropdownRulesTleRow jqDropdownRemoveBeforeInsert">
		<vscode-text-field type="text" class="jqRecordSizeInput jqInput">
			Максимальный размер
			<span class="span_input-required">*</span>
		</vscode-text-field>
		<span class="tle__row__input__helper">При превышении этого размера табличный список будет сокращен до типичного размера. Будут удалены самые старые записи.</span>
	</div>
	<div class="tle__row jqDropdownRulesTleRow jqDropdownRemoveBeforeInsert">
		<label for="switch-group">
			Ограничить время жизни записи
		</label>
		<div id="switch-group" class="tle__row__switch-group">
			<label class="switch">
  				<input id="jqTimeSwitch" type="checkbox" class="uiToggleSwitch">
  				<span class="slider round"></span>
			</label>
			<div class="time-input-group">
				<vscode-text-field type="text" class="jqTimeDayInput jqTimeInput time-input"></vscode-text-field>
				<span>дн.</span>
			</div>
			<div class="time-input-group">
				<vscode-text-field type="text" class="jqTimeHourInput jqTimeInput time-input"></vscode-text-field>
				<span>ч.</span>
			</div>
			<div class="time-input-group">
				<vscode-text-field type="text" class="jqTimeMinuteInput jqTimeInput time-input"></vscode-text-field>
				<span>мин.</span>
			</div>
		</div>
	</div>
`

export const jqDropdownListTleRows = `
	<div class="tle__row jqDropdownListTleRow jqDropdownRemoveBeforeInsert">
		<label for="jqTypeDropdown">
			Тип объектов
			<span class="span_input-required">*</span>
		</label>
		<vscode-dropdown id="jqListTypeDropdown">
			<vscode-option>string</vscode-option>
			<vscode-option>number</vscode-option>
			<vscode-option>datetime</vscode-option>
			<vscode-option>regex</vscode-option>
		</vscode-dropdown>
	</div>
	<div class="tle__row jqDropdownListTleRow jqDropdownRemoveBeforeInsert">
		<vscode-text-field type="text" class="jqScoreInput jqInput">
			Минимальный score
		</vscode-text-field>
		<span class="tle__row__input__helper">Целое число от 0 до 100. Можно не заполнять, тогда будут импортироваться все объекты.</span>
	</div>
`