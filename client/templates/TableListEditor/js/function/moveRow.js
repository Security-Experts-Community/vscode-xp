let _row;

function _rowDragStart(draggableRow) {
	_row = $(draggableRow)[0];
}

function _rowDragOver(draggableRow, e) {
	e.preventDefault();

	let _draggableRows = Array.from($('.draggable-row'));

	if (_draggableRows.indexOf($(draggableRow)[0]) > _draggableRows.indexOf(_row))
		$(draggableRow)[0].after(_row);
	else
		$(draggableRow)[0].before(_row);
}

export const addOnDragStartEventListenerToRow = (draggableRow) => {
	$(draggableRow)[0].addEventListener("dragstart", (e) => {
		_rowDragStart(draggableRow);
	});
}

export const addOnDragOverEventListenerToRow = (draggableRow) => {
	$(draggableRow)[0].addEventListener("dragover", (e) => {
		_rowDragOver(draggableRow, e);
	});
}

export const addOnDragStartAndOverEventListenerToRow = (draggableRow) => {
	addOnDragStartEventListenerToRow(draggableRow);
	addOnDragOverEventListenerToRow(draggableRow);
}

export const addOnDragStartAndOverEventListenerToAllRows = () => {
	$.each($('.draggable-row'), function (i) {
		addOnDragStartAndOverEventListenerToRow(this);
	})
}

