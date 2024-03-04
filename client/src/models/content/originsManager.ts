import { Guid } from 'guid-typescript';

import { Configuration } from '../configuration';
import { XpException } from '../xpException';

export class Origin {
	contentPrefix: string;
	ru: string;
	en: string;
	id: string;
}

export class OriginsManager {
	public static async init(config : Configuration) : Promise<void> {
		const configuration = config.getConfiguration();
		const origin = configuration.get<any>("origin");
		
		// Если id нет, задаём.
		if(!origin.id) {
			const newGuid = Guid.create().toString();
			origin.id = newGuid;
			await configuration.update("origin", origin, true, false);
		}
		
		return;
	}

	public static getCurrentOrigin(config : Configuration) : any {
		// [
		// 	{
		// 		"Id": "95a1cca9-50b5-4fae-91a2-26aa36648c3c",
		// 		"SystemName": "SEC",
		// 		"Nickname": "SEC",
		// 		"DisplayName": [
		// 			{
		// 				"Locale": "ru",
		// 				"Value": "Security Experts Community"
		// 			},
		// 			{
		// 				"Locale": "en",
		// 				"Value": "Security Experts Community"
		// 			}
		// 		],
		// 		"Revision": 1
		// 	}
		// ]
		const configuration = config.getConfiguration();
		const origin = configuration.get<any>("origin");
		const id = origin.id;
		const ru = origin.ru;
		const en = origin.en;
		const contentPrefix = origin.contentPrefix;

		if(!contentPrefix) {
			throw new XpException(`Не задан поставщик для экспорта KB-файла. Задайте параметр [contentPrefix](command:workbench.action.openSettings?["xpConfig.origin"]) и повторите`);
		}

		return [
			{
				"Id": id,
				"SystemName": contentPrefix,
				"Nickname": contentPrefix,
				"DisplayName": [
					{
						"Locale": "ru",
						"Value": ru
					},
					{
						"Locale": "en",
						"Value": en
					}
				],
				"Revision": 1
			}
		];
	}
}