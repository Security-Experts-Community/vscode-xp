import * as vscode from 'vscode';
import * as path from 'path';

export class ParserHelper {
	public static parseTokenWithInsidePosition(line: vscode.TextLine, position: vscode.Position) : string {
		const firstNonWhitespaceCharacterIndex = line.firstNonWhitespaceCharacterIndex;
		const mouseOffset = position.character - firstNonWhitespaceCharacterIndex;
		const textLine = line.text.substring(firstNonWhitespaceCharacterIndex);

		// Ищем кусок токена до позиции мышки.
		const beforePart = textLine.substring(0, mouseOffset);
		let startTokenIndex = beforePart.length - 1;
		// eslint-disable-next-line for-direction
		for (; startTokenIndex > 0; startTokenIndex--) {
			if(beforePart[startTokenIndex] === " ") {
				startTokenIndex++;
				break;
			}

			// Проверяем предыдущий символ, который надо тоже исключить.
			const prevTokenIndex = startTokenIndex - 1;
			const prevChar = beforePart[prevTokenIndex];
			if(prevTokenIndex > 0 && [")", "]", "(", "[", ","].includes(prevChar)) {
				break;
			}
		}

		const firstPart = beforePart.substring(startTokenIndex);

		// Ищем кусок токена после позиции мышки.
		const afterPart = textLine.substring(mouseOffset);
		let endTokenIndex = 0;
		for (; endTokenIndex < afterPart.length; endTokenIndex++) {
			if(afterPart[endTokenIndex] === " ") {
				break;
			}

			// Проверяем следующий символ, который надо тоже исключить.
			const nextTokenIndex = endTokenIndex;
			const nextChar = afterPart[nextTokenIndex];
			if(nextTokenIndex <= afterPart.length - 1 && [")", "]", "(", "[", ","].includes(nextChar)) {
				break;
			}
		}

		const secondPart = afterPart.substring(0, endTokenIndex);
		const selectedToken = firstPart + secondPart;
		return selectedToken;	
	} 
}