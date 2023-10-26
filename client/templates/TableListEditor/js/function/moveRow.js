export const makeRowsSortableTakingIntoDynamicallyAddedRows = () => {
	$('vscode-data-grid').sortable({
		items: '> .draggable-row',
		handle: ".move-row-button",
		placeholder: "row_insert-highlight",
		axis: 'y',
		tolerance: "pointer"
	})
}

