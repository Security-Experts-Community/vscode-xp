export class ExtensionState {
	constructor() {
		this._toolingExecution = false;
	}

	public startExecutionState() {
		this._toolingExecution = true;
	}

	public isExecutedState() {
		return this._toolingExecution;
	}

	public stopExecutionState() {
		this._toolingExecution = false;
	}

	public static get(): ExtensionState {
		if(!ExtensionState._singleton) {
			ExtensionState._singleton = new ExtensionState();
		}
		
		return ExtensionState._singleton;
	}

	private _toolingExecution : boolean;

	private static _singleton : ExtensionState;
}