/** 
 * Константа, хранящая в себе шаблонную колонку для data-grid из vscode webview ui toolkit в TableListEditor.html
 * 
 * ВНИМАНИЕ: если происходит обновление vscode-data-grid-row в TableListEditor.html,
 * нужно обновить этот шаблон! Код из vscode-data-grid-row в TableListEditor.html 
 * должен совпадать с этим шаблоном!
 */
export const tableRow = `
	<vscode-data-grid-row draggable="true" class="draggable-row">
    	<vscode-data-grid-cell grid-column="1" class="tle__row__table__cell-icon move-icon">:::</vscode-data-grid-cell>
    	<vscode-data-grid-cell grid-column="2">
			<vscode-text-field type="text"></vscode-text-field>
		</vscode-data-grid-cell>
    	<vscode-data-grid-cell grid-column="3">
			<vscode-dropdown>
  				<vscode-option value="String">Строка</vscode-option>
                <vscode-option value="Number">Число</vscode-option>
                <vscode-option value="DataTime">Дата и Время</vscode-option>
                <vscode-option value="DataTime">Регулярное выражение</vscode-option>
			</vscode-dropdown>
		</vscode-data-grid-cell>
    	<vscode-data-grid-cell grid-column="4">
			<vscode-checkbox></vscode-checkbox>
		</vscode-data-grid-cell>
		<vscode-data-grid-cell grid-column="5">
			<vscode-checkbox></vscode-checkbox>
		</vscode-data-grid-cell>
    	<vscode-data-grid-cell grid-column="6">
			<vscode-checkbox></vscode-checkbox>
		</vscode-data-grid-cell>
		<vscode-data-grid-cell grid-column="7" class="tle__row__table__cell-icon remove-row-button">🗑️</vscode-data-grid-cell>
	</vscode-data-grid-row>
`;