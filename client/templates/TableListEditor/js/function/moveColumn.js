export let row;

function start(draggableRow) {
	row = $(draggableRow)[0];
}

function dragover(draggableRow, e) {
	e.preventDefault();

	let children = Array.from($('.draggable-row'));
	console.log(children)

	if (children.indexOf($(draggableRow)[0]) > children.indexOf(row))
		$(draggableRow)[0].after(row);
	else
		$(draggableRow)[0].before(row);
}

export const addOnDragStartEventListenerToVsCodeDataGridRow = (draggableRow) => {
	$(draggableRow)[0].addEventListener("dragstart", (e) => {
		start(draggableRow);
	});
}

export const addOnDragOverEventListenerToVsCodeDataGridRow = (draggableRow) => {
	$(draggableRow)[0].addEventListener("dragover", (e) => {
		dragover(draggableRow, e);
	});
}

export const addOnDragStartAndOverEventListenerToVsCodeDataGridRow = (draggableRow) => {
	// console.log(draggableRow);
	addOnDragStartEventListenerToVsCodeDataGridRow(draggableRow);
	addOnDragOverEventListenerToVsCodeDataGridRow(draggableRow);
}

export const addOnDragStartAndOverEventListenerToVsCodeDataGridRows = () => {
	$.each($('.draggable-row'), function (i) {
		addOnDragStartAndOverEventListenerToVsCodeDataGridRow(this);
	})
}

