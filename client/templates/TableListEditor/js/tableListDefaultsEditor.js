import { provideVSCodeDesignSystem, vsCodeDataGrid, vsCodeDataGridCell, vsCodeDataGridRow, vsCodeButton } from '@vscode/webview-ui-toolkit';

const vscode = acquireVsCodeApi();
provideVSCodeDesignSystem().register(vsCodeDataGrid(), vsCodeDataGridRow(), vsCodeDataGridCell(), vsCodeButton());
let currentRowData = null;
let currentGrid = null;
let currentRowIndex = null;

(function () {

    var addNewLOCButton = document.getElementById("add-loc-value-button");
    var addNewPTButton = document.getElementById("add-pt-value-button");
    var updateFileButton = document.getElementById("update-file-button");
    var highlightErrorsButton = document.getElementById("highlight-errors-button");

    highlightErrorsButton.disabled = false;
    updateFileButton.disabled = true;

    addNewLOCButton.onclick = () => {
        vscode.postMessage({
            type: 'add_loc'
        });
    }; 

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

    highlightErrorsButton.onclick = () => {
        HighlightErrors();
    }; 

    var fields = null;
    const loc_grid = document.getElementById("loc-defs");
    const pt_grid = document.getElementById("pt-defs");
    initEditableDataGrid(loc_grid);
    initEditableDataGrid(pt_grid);
    if (checkTable()){
        var updateFileButton = document.getElementById("update-file-button");
        updateFileButton.disabled = false;
        vscode.postMessage({
            type: 'refresh'
        });
    }

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
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                syncCellChanges(cell);
                unsetCellEditable(cell);
            }
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                e.preventDefault();
            }
        }
    }

    // Make a given cell editable
    function setCellEditable(cell) {
        cell.setAttribute("contenteditable", "true");
        selectCellText(cell);
    }

    // Make a given cell non-editable
    function unsetCellEditable(cell) {
        cell.setAttribute("contenteditable", "false");
        deselectCellText();
    }

    // Select the text of an editable cell
    function selectCellText(cell) {
        const selection = window.getSelection();
        if (selection) {
            const range = document.createRange();
            range.selectNodeContents(cell);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    // Deselect the text of a cell that was previously editable
    function deselectCellText() {
        const selection = window.getSelection();
        if (selection) {
            selection.removeAllRanges();
        }
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
            case 'update_view':
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
                const values = getFields(fields);
				for (var i = 0; i < values.length; i++){
					obj[values[i]] = "-"
				}
				// eslint-disable-next-line @typescript-eslint/naming-convention
				loc_grid.rowsData.unshift(obj);
				refreshResxData();
                return;
			}
			case 'add_pt':
			{
				const obj = {};
                const values = getFields(fields);
				for (var i = 0; i < values.length; i++){
					obj[values[i]] = "-"
				}
				// eslint-disable-next-line @typescript-eslint/naming-convention
				pt_grid.rowsData.unshift(obj);
				refreshResxData();
                return;
			}
        }
    });

    function getType(col_name) {
        return fields[col_name].type;
    }

    function checkNullableError(key, value) {
        return !fields[key].nullable && value === null;
    }

    function checkRegEx(pattern) {
        var isValid = true;
        try {
            new RegExp(pattern);
        } catch(e) {
            isValid = false;
        }
        return isValid;
    }

    function checkFields(row) {
        var status = true;
        for (const [key, value] of Object.entries(row)) {
            if (checkNullableError(key, value)){
                const msg = `Null value for not nullable column ${key}: '${value}'`;
                sendError(msg);
                status = false;
                break;
            }
            var col_type = getType(key)
            switch (col_type) {
                case 'Number':
                  if (isNaN(value)){
                    const msg = `Invalid value for type ${col_type} in column ${key}: '${value}'`;
                    sendError(msg);
                    status = false;
                  }
                  break;
                case 'Regex':
                    if (!checkRegEx(value)){
                        const msg = `Invalid value for type ${col_type} in column ${key}: '${value}'`;
                        sendError(msg);
                        status = false;
                    }
                  break;
                default:
                break;
              }
            if (!status){
                break;
            }
        }
        return status;
    }

    function checkTable(){
        //try{
            var status = true;
            var obj = {'loc':[], 'pt': [],};
            for (var i = 0; i < loc_grid.rowsData.length; i++) {
                Object.keys(loc_grid.rowsData[i]).forEach(function(key, index) {
                    if(loc_grid.rowsData[i][key] === '') {loc_grid.rowsData[i][key] = null}
                });
                //loc_grid._rowElements[i+1]._cellElements.forEach((cell) => cell.style.backgroundColor = "#381010");
                if (!checkFields(loc_grid.rowsData[i])){status = false;}
                //loc_grid._rowElements[i+1]._cellElements.forEach((cell) => cell.style.backgroundColor = "");
                //obj['loc'].push(loc_grid.rowsData[i]);
            }
                
            for (var i = 0; i < pt_grid.rowsData.length; i++) {
                Object.keys(pt_grid.rowsData[i]).forEach(function(key, index) {
                    if(pt_grid.rowsData[i][key] === '') {pt_grid.rowsData[i][key] = null}
                });
                //pt_grid._rowElements[i+1]._cellElements.forEach((cell) => cell.style.backgroundColor = "#381010");
                if (!checkFields(pt_grid.rowsData[i])){status = false;}
                //pt_grid._rowElements[i+1]._cellElements.forEach((cell) => cell.style.backgroundColor = "");
                //obj['pt'].push(pt_grid.rowsData[i]);
            }

            return status;
        //}
        //catch(e) {
        //    return false;
        //} 
    }

    function refreshResxData(highlight=false) {
        var updateFileButton = document.getElementById("update-file-button");
        updateFileButton.disabled = false;

        var obj = {'loc':[], 'pt': [],};
        for (var i = 0; i < loc_grid.rowsData.length; i++) {
            Object.keys(loc_grid.rowsData[i]).forEach(function(key, index) {
                if(loc_grid.rowsData[i][key] === '') {loc_grid.rowsData[i][key] = null}
                if (loc_grid.rowsData[i][key] !== null && !isNaN(loc_grid.rowsData[i][key])){
                    loc_grid.rowsData[i][key] = Number(loc_grid.rowsData[i][key])
                }
            });
        
            if (!checkFields(loc_grid.rowsData[i]))
            { 
                updateFileButton.disabled = true;
                if(highlight)
                {loc_grid._rowElements[i+1]._cellElements.forEach((cell) => cell.style.backgroundColor = "#381010");}
            }
            else{
                loc_grid._rowElements[i+1]._cellElements.forEach((cell) => cell.style.backgroundColor = "");
            }
            obj['loc'].push(loc_grid.rowsData[i]);
        }
            
        for (var i = 0; i < pt_grid.rowsData.length; i++) {
            Object.keys(pt_grid.rowsData[i]).forEach(function(key, index) {
                if(pt_grid.rowsData[i][key] === '') {pt_grid.rowsData[i][key] = null}
                if (pt_grid.rowsData[i][key] !== null && !isNaN(pt_grid.rowsData[i][key])){
                    pt_grid.rowsData[i][key] = Number(pt_grid.rowsData[i][key])
                    }
            });
            
            if (!checkFields(pt_grid.rowsData[i]))
            { 
                updateFileButton.disabled = true;
                if (highlight)
                {pt_grid._rowElements[i+1]._cellElements.forEach((cell) => cell.style.backgroundColor = "#381010");}
            }
            else {
                pt_grid._rowElements[i+1]._cellElements.forEach((cell) => cell.style.backgroundColor = "") 
            }
            obj['pt'].push(pt_grid.rowsData[i]);
        }

        vscode.setState({ text: JSON.stringify(obj) });

        if (!updateFileButton.disabled){
            vscode.postMessage({
                type: 'update_file',
                json: JSON.stringify(obj)
            });
        }
    }

    function HighlightErrors() {
        var obj = {'loc':[], 'pt': [],};
        for (var i = 0; i < loc_grid.rowsData.length; i++) {
            Object.keys(loc_grid.rowsData[i]).forEach(function(key, index) {
                if(loc_grid.rowsData[i][key] === '') {loc_grid.rowsData[i][key] = null}
                if (loc_grid.rowsData[i][key] !== null && !isNaN(loc_grid.rowsData[i][key])){
                    loc_grid.rowsData[i][key] = Number(loc_grid.rowsData[i][key])
                }
            });
        
            if (!checkFields(loc_grid.rowsData[i])) { 
                loc_grid._rowElements[i+1]._cellElements.forEach((cell) => cell.style.backgroundColor = "#381010");
            }
            else{
                loc_grid._rowElements[i+1]._cellElements.forEach((cell) => cell.style.backgroundColor = "");
            }
        }
            
        for (var i = 0; i < pt_grid.rowsData.length; i++) {
            Object.keys(pt_grid.rowsData[i]).forEach(function(key, index) {
                if(pt_grid.rowsData[i][key] === '') {pt_grid.rowsData[i][key] = null}
                if (pt_grid.rowsData[i][key] !== null && !isNaN(pt_grid.rowsData[i][key])){
                    pt_grid.rowsData[i][key] = Number(pt_grid.rowsData[i][key])
                    }
            });
            if (!checkFields(pt_grid.rowsData[i])) { 
                pt_grid._rowElements[i+1]._cellElements.forEach((cell) => cell.style.backgroundColor = "#381010");
            }
            else {
                pt_grid._rowElements[i+1]._cellElements.forEach((cell) => cell.style.backgroundColor = "") 
            }
        }
    }

    function sendError(message) {
        vscode.postMessage({
            type: 'error',
            message: message
        });
    }

    function getFields(object) {
        return Object.keys(object).filter((f) => (f != 'complex_key'));
    }

    function getDict(array){
        var temp = {};
        for (var o of array) {
            temp = {...temp, ...o};
        }
        return temp;
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

            fields = getDict(json['fields']);

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