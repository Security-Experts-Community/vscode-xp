export class JsHelper {
	public static wait(milliseconds : number) : Promise<void> {
		return new Promise(resolve => setTimeout(resolve, milliseconds));
	}

	public static isEmptyObj(obj : any) : boolean {
		return Object.keys(obj).length === 0;
	}
}