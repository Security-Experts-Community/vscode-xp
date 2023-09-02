import * as vscode from 'vscode';
export class RegExpHelper {
	public static getExpectSection() : RegExp {
		return /expect\s*(\d+|not)\s*{(.*)}/gm;
	}

	public static getJsons() : RegExp {
		return /({.*?})/g;
	}

	public static getAllStrings(inputText : string, regExp: RegExp) : string[] {

		const strings : string[] = [];
		let curResult: RegExpExecArray | null;
		while ((curResult = regExp.exec(inputText))) {
			
			const curValue = curResult[2];
			strings.push(curValue);
		}

		return strings;
	}

	/**
	 * Заменяет выражение подходящее под регулярку на содержимое первой группы.
	 * @param inputText 
	 * @param regExp 
	 * @returns результирующая строка.
	 */
	public static replaceAllStrings(inputText : string, regExp: RegExp) : string {
		if (!inputText) { return ""; }
		let curResult: RegExpExecArray | null;
		while ((curResult = regExp.exec(inputText))) {
			const arrayElement = curResult[0];
			const firstGroup = curResult[1];

			inputText = inputText.replace(arrayElement, firstGroup);
		}
		return inputText;
	}

	/**
	 * Парсит элементы по регулярному выражение и собирает их в единый список.
	 * Регулярное выражение собирает значение первой группы и только они попадают в массив.
	 * @param text строка
	 * @param regExp регулярное выражение с заполненой второй группой
	 * @returns 
	 */
	public static parseValues(text : string, reg : string|RegExp, flags : string) : string[] {
		const values : string [] = [];
		let parseResult: RegExpExecArray | null;

		const regExp = new RegExp(reg, flags);
		while ((parseResult = regExp.exec(text))) {
			if(parseResult.length != 2) {
				continue;
			}
			
			const value : string = parseResult[1];
			values.push(value);
		}
		return values;
	}

	/**
	 * Парсить js-массивы ([1, 2, 3]) из строки по регулярному выражению и объединяет их в единый список.
	 * Регулярное выражение собирает значение первой группы и только они попадают в массив.
	 * @param text строка 
	 * @param regExp регулярное выражение с заполненой второй группой
	 * @returns совокупный список всех элементов
	 */
	public static parseJsArrays(text : string, reg : string|RegExp, flags : string) : string[] {
		const arrays : string [] = [];
		let parseResult: RegExpExecArray | null;
		const regExp = new RegExp(reg, flags);
		while ((parseResult = regExp.exec(text))) {
			if(parseResult.length != 2) {
				continue;
			}
			
			const array : string = parseResult[1];
			arrays.push(array);
		}

		const values = arrays.flatMap(array => JSON.parse(array));
		return values;
	}

	public static parseFunctionCalls(text: string, lineNumber: number, fuctionNames: string[]) : vscode.Range [] {
		const functionCallRegEx = /(?:.*?)([A-Za-z0-9_]+)\(/g;

		const functionCalls : vscode.Range [] = [];

		// Проходимся по каждой строке для того чтобы получить нужные Position в документе.
		let parseResult: RegExpExecArray | null;
		let prevFunctionNameIndex = 0;
		while ((parseResult = functionCallRegEx.exec(text))) {
			if(parseResult.length != 2) {
				continue;
			}
			
			// Находим вызов функции.
			const functionCall = parseResult[1];
			if(!fuctionNames.includes(functionCall)) {
				continue;
			}

			// Расчитываем позицию вызова функции в коде.
			const beginIndex = text.indexOf(functionCall + "(", prevFunctionNameIndex);
			const endIndex = beginIndex + functionCall.length;

			// Проверка наличия комментария в строке.
			const fromStringBeginToFunctionCall = text.substring(0, endIndex);
			const isCommented = fromStringBeginToFunctionCall.indexOf('#');
			if(isCommented !== -1 ) {
				continue;
			}

			functionCalls.push(new vscode.Range(
				new vscode.Position(lineNumber, beginIndex), 
				new vscode.Position(lineNumber, endIndex)
			));

			// Сдвигаемся на одну позицию.
			prevFunctionNameIndex = beginIndex + 1;
		}

		return functionCalls;
	}
}