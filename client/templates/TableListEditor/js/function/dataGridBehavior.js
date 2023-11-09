export const addOnClickEventListenerToDataGrid = () => {
	$('vscode-data-grid')[0].removeEventListener("keydown", (e) => {
		// switch (e.keyCode) {
		// 	case 37:
		// 		console.log('Left key');
		// 		e.preventDefault();
		// 		break;
		// 	case 38:
		// 		console.log('Up key');
		// 		e.preventDefault();
		// 		break;
		// 	case 39:
		// 		console.log('Right key');
		// 		e.preventDefault();
		// 		break;
		// 	case 40:
		// 		console.log('Down key');
		// 		e.preventDefault();
		// 		break;
		// }
		// console.log('s')
		// e.preventDefault();
		// e.stopPropagation();
	});
}