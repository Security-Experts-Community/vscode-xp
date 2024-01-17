import { provideVSCodeDesignSystem, vsCodeDataGrid, vsCodeDataGridCell, vsCodeDataGridRow, vsCodeButton } from '@vscode/webview-ui-toolkit';

const vscode = acquireVsCodeApi();
provideVSCodeDesignSystem().register(vsCodeDataGrid(), vsCodeDataGridRow(), vsCodeDataGridCell(), vsCodeButton());
let currentRowData = null;
let currentGrid = null;
let currentRowIndex = null;

(function () {

    var addNewLOCButton = document.getElementById("add-loc-value-button");
    var addNewPTButton = document.getElementById("add-pt-value-button");

    addNewLOCButton.onclick = () => {
        vscode.postMessage({
            type: 'add_loc'
        });
    };

    addNewPTButton.onclick = () => {
        vscode.postMessage({
            type: 'add_pt'
        });
    };


	var values = [];
    const loc_grid = document.getElementById("loc-defs");
    const pt_grid = document.getElementById("pt-defs");
    initEditableDataGrid(loc_grid);
    initEditableDataGrid(pt_grid);

    function initEditableDataGrid(grid) {
        grid.oncontextmenu = cellRightClick;
        grid?.addEventListener("cell-focused", (e) => {
            const cell = e.target;
            // Do not continue if `cell` is undefined/null or is not a grid cell
            if (!cell || cell.role !== "gridcell") {
                return;
            }
            // Do not allow data grid header cells to be editable
            if (cell.className === "column-header") {
                return;
            }

            // Note: Need named closures in order to later use removeEventListener
            // in the handleBlurClosure function
            const handleKeydownClosure = (e) => {
                handleKeydown(e, cell);
            };
            const handleClickClosure = () => {
                setCellEditable(cell);
            };
            const handleBlurClosure = () => {
                syncCellChanges(cell);
                unsetCellEditable(cell);
                // Remove the blur, keydown, and click event listener _only after_
                // the cell is no longer focused
                cell.removeEventListener("blur", handleBlurClosure);
                cell.removeEventListener("keydown", handleKeydownClosure);
                cell.removeEventListener("click", handleClickClosure);
            };

            cell.addEventListener("keydown", handleKeydownClosure);
            cell.addEventListener("click", handleClickClosure);
            cell.addEventListener("blur", handleBlurClosure);
        });
    }

    // Handle keyboard events on a given cell
    function handleKeydown(e, cell) {
        if (!cell.hasAttribute("contenteditable") || cell.getAttribute("contenteditable") === "false") {
            if (e.key === "Enter") {
                e.preventDefault();
                setCellEditable(cell);
            }
        } else {
            if (e.key === "Enter" || e.key === "Escape") {
                e.preventDefault();
                syncCellChanges(cell);
                unsetCellEditable(cell);
            }
        }
    }

    // Make a given cell editable
    function setCellEditable(cell) {
        cell.setAttribute("contenteditable", "true");
    }

    // Make a given cell non-editable
    function unsetCellEditable(cell) {
        cell.setAttribute("contenteditable", "false");
    }

    // Syncs changes made in an editable cell with the
    // underlying data structure of a vscode-data-grid
    function syncCellChanges(cell) {
        const column = cell.columnDefinition;
        const row = cell.rowData;

        if (column && row) {
            const originalValue = row[column.columnDataKey];
            const newValue = cell.innerText;

            if (originalValue !== newValue) {
                row[column.columnDataKey] = newValue;
                sendLog("Value changed...Original value: " + originalValue + "; " + "New value: " + newValue);
                refreshResxData();
            }
        }
    }

    function cellRightClick(cell) {
        const sourceElement = cell.target;
        currentRowData = sourceElement._rowData;
		currentRowIndex = sourceElement.parentElement._rowIndex;
		currentGrid = sourceElement.parentNode.parentNode;
    }

    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'update':
                const text = message.text;
                if (text !== vscode.getState()?.text) {
                    updateContent(text);
                }

                vscode.setState({ text });

                return;
            case 'delete':
				if (currentGrid.rowsData.length == 1){
					currentGrid.rowsData = [];
					refreshResxData();
					return;
				}
                if (currentRowData) {
                    const index = currentGrid.rowsData.indexOf(currentRowData);
                    if (index > -1) {
                        currentGrid.rowsData.splice(index, 1);
                        refreshResxData();
                    }
                }
                else {
                    vscode.postMessage({
                        type: 'info',
                        message: `No selected resource selected. Please select a resource to delete.`
                    });
                }
                return;
            case 'add_loc':
			{
				const obj = {};
				for (var i = 0; i < values.length; i++){
					obj[values[i]] = "-"
				}
				// eslint-disable-next-line @typescript-eslint/naming-convention
				loc_grid.rowsData.push(obj);
				refreshResxData();
                return;
			}
			case 'add_pt':
			{
				const obj = {};
				for (var i = 0; i < values.length; i++){
					obj[values[i]] = "-"
				}
				// eslint-disable-next-line @typescript-eslint/naming-convention
				pt_grid.rowsData.push(obj);
				refreshResxData();
                return;
			}
        }
    });

    function refreshResxData() {
        var obj = {'loc':[], 'pt': [],};
        for (var i = 0; i < loc_grid.rowsData.length; i++) {
            obj['loc'].push(loc_grid.rowsData[i]);
        }
		    
		for (var i = 0; i < pt_grid.rowsData.length; i++) {
            obj['pt'].push(pt_grid.rowsData[i]);
        }

        vscode.setState({ text: JSON.stringify(obj) });
        vscode.postMessage({
            type: 'update',
            json: JSON.stringify(obj)
        });
    }

    function sendLog(message) {
        vscode.postMessage({
            type: 'log',
            message: message
        });
    }

    function updateContent(/** @type {string} **/ text) {
        if (text) {

            var locValues = [];
			var ptValues = [];

            let json;
            try {
                json = JSON.parse(text);
            }
            catch
            {
                console.log("error parsing json");
                return;
            }

			values = json['fields']

            for (const node in json['loc']  || []) {
                if (node) {
                    let res = json['loc'][node];
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    locValues.push(res);
                }
                else {
                    console.log('node is undefined or null');
                }
            }

            loc_grid.rowsData = locValues;
			
            for (const node in json['pt']  || []) {
                if (node) {
                    let res = json['pt'][node];
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    ptValues.push(res);
                }
                else {
                    console.log('node is undefined or null');
                }
            }

            pt_grid.rowsData = ptValues;

        }
        else {
            console.log("text is null");
            return;
        }
    }

    const state = vscode.getState();
    if (state) {
        updateContent(state.text);
    }
})();