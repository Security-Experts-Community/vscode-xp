import { validateInput } from "./validation.js";

export const addSpinersToAssetGridFields = () => {
	$('.jqScoreInput').spinner({
		max: 100,
		min: 0
	});
}

export const addSpinersToRulesFields = () => {
	$('.jqRecordSizeInput').spinner({
		max: 2147483647,
		min: 0,
  		stop: function(event) {
			validateInput(event.target)
  		}
	});
	$('.jqTimeDayInput').spinner({
		max: 90,
		min: 0,
  		stop: function(event) {
			validateInput(event.target)
  		}
	});
	$('.jqTimeHourInput').spinner({
		max: 23,
		min: 0,
  		stop: function(event) {
			validateInput(event.target)
  		}
	});
		$('.jqTimeMinuteInput').spinner({
		max: 59,
		min: 0,
  		stop: function(event) {
			validateInput(event.target)
  		}
	});
}

export const enableRulesFieldsSpiners = () => {
	$('.jqTimeDayInput').spinner("enable");
	$('.jqTimeHourInput').spinner("enable");
	$('.jqTimeMinuteInput').spinner("enable");
}

export const disableRulesFieldsSpiners = () => {
	$('.jqTimeDayInput').spinner("disable");
	$('.jqTimeHourInput').spinner("disable");
	$('.jqTimeMinuteInput').spinner("disable");
}

