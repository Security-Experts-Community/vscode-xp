let _row;

// const _rowDragStart = (draggableRow) => {
// 	_row = $(draggableRow)[0];
// }

// const _rowDragOver = (draggableRow, e) => {
// 	e.preventDefault();

// 	console.log(_row)

// 	let _draggableRows = Array.from($('.draggable-row'));

// 	if (_draggableRows.indexOf($(draggableRow)[0]) > _draggableRows.indexOf(_row))
// 		$(draggableRow)[0].after(_row);
// 	else
// 		$(draggableRow)[0].before(_row);
// }

function _rowDragStart(draggableCell) {
	_row = $(draggableCell).parent()[0];
	$(draggableCell).parent()
}

function _rowDragOver(draggableCell, e) {
	// console.log($(draggableCell).parent()[0]);
	// e.preventDefault();

	let _draggableRows = Array.from($('.draggable-row'));

	if (_draggableRows.indexOf($(draggableCell).parent()[0]) > _draggableRows.indexOf(_row))
		$(draggableCell).parent()[0].after(_row);
	else
		$(draggableCell).parent()[0].before(_row);
}

// export const addOnDragStartEventListenerToRow = (draggableRow) => {
// 	$(draggableRow)[0].addEventListener("dragstart", (e) => {
// 		_rowDragStart(draggableRow);
// 	});
// }

// export const addOnDragOverEventListenerToRow = (draggableRow) => {
// 	$(draggableRow)[0].addEventListener("dragover", (e) => {
// 		_rowDragOver(draggableRow, e);
// 	});
// }

export const addOnDragOverEventListenerToRow = (draggableRow) => {
	$(draggableRow)[0].addEventListener("dragover", (e) => {
		e.preventDefault();
	});
}

export const addOnDragStartEventListenerToCell = (draggableRow) => {
	const draggableCell = $(draggableRow).children('.move-row-button')[0];
	draggableCell.addEventListener("dragstart", (e) => {
		_rowDragStart(draggableCell);
	});
}

export const addOnDragOverEventListenerToCell = (draggableRow) => {
	const draggableCell = $(draggableRow).children('.move-row-button')[0];
	draggableCell.addEventListener("dragover", (e) => {
		_rowDragOver(draggableCell, e);
	});
}

export const addOnDragStartAndOverEventListenerToRow = (draggableRow) => {
	addOnDragStartEventListenerToCell(draggableRow);
	addOnDragOverEventListenerToCell(draggableRow);
	addOnDragOverEventListenerToRow(draggableRow);
}

export const addOnDragStartAndOverEventListenerToAllRows = () => {
	$.each($('.draggable-row'), function (i) {
		addOnDragStartAndOverEventListenerToRow(this);
	})
}

