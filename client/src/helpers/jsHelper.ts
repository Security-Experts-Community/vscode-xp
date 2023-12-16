export class JsHelper {
	public static wait(milliseconds : number) : Promise<void> {
		return new Promise(resolve => setTimeout(resolve, milliseconds));
	}

	public static isEmptyObj(obj : any) : boolean {
		return Object.keys(obj).length === 0;
	}

	/**
	 * Возвращает первый дублирующий элемент или null
	 */
	public static findDuplicates(arr: string[]): string {
		const sortedArr = arr.slice().sort();
		for (let i = 0; i < sortedArr.length - 1; i++) {
			if (sortedArr[i + 1] == sortedArr[i]) {
				return sortedArr[i];
			}
		}
		return null;
	}

	public static removeEmptyKeys(obj : any) : any {
		for (const key in obj) {
			if(!obj[key]) {
				delete obj[key];
			}
		}

		return obj;
	}

	public static formatJsonObject(object: any) : string {
		return JSON.stringify(object, null, 4);
	}

	public static sortObjectKeys(object: any) {
		if (typeof object != "object") { return object; }
		if (object instanceof Array) {
			return object.map((obj) => { return this.sortObjectKeys(obj); });
		}
		const keys = Object.keys(object);
		if (!keys) { return object; }
		return keys.sort().reduce((obj, key) => {
			if (object[key] instanceof Array) {
				obj[key] = this.sortObjectKeys(object[key]);
			} else {
				obj[key] = object[key];
			}
			return obj;
		}, {});
	}
}