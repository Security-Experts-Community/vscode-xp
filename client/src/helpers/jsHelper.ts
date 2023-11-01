export class JsHelper {
	public static wait(milliseconds : number) : Promise<void> {
		return new Promise(resolve => setTimeout(resolve, milliseconds));
	}

	public static findDuplicates(arr: string[]): string {
		const sorted_arr = arr.slice().sort();
		for (let i = 0; i < sorted_arr.length - 1; i++) {
			if (sorted_arr[i + 1] == sorted_arr[i]) {
				return sorted_arr[i];
			}
		}
		return null;
	}

	public static isEmptyObj(obj : any) : boolean {
		return Object.keys(obj).length === 0;
	}

	public static removeEmptyKeys(obj : any) : any {
		for (const key in obj) {
			if(!obj[key]) {
				delete obj[key];
			}
		}

		return obj;
	}
}