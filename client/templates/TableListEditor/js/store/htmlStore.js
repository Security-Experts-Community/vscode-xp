/** 
 * Константа, хранящая в себе шаблонную колонку для data-grid из vscode webview ui toolkit в TableListEditor.html
 */
export const tableColumn = `
	<vscode-data-grid-row>
    	<vscode-data-grid-cell grid-column="1" class="tle__row__table__cell-icon">:::</vscode-data-grid-cell>
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
		<vscode-data-grid-cell grid-column="7" class="tle__row__table__cell-icon">🗑️</vscode-data-grid-cell>
	</vscode-data-grid-row>
`;