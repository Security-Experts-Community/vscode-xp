export const addEventListenerOnChangeToToggleSwitch = () => {
	$('.uiToggleSwitch').on("change", function () {
		this.hasAttribute('checked') ? this.removeAttribute('checked') : this.setAttribute('checked', 'checked')
	})
}