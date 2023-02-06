import { Configuration } from '../models/configuration';
import { ContentType } from './contentType';

export class ContentTypeChecker {
	public static getContentTypeBySubDirectories(subDirectories: string[]): ContentType | undefined {
		if (subDirectories.includes("compiled-rules") &&
			subDirectories.includes("resources") &&
			subDirectories.includes("rules")
		) {
			return ContentType.EDR;
		}

		if (subDirectories.includes("_extra") &&
			subDirectories.includes("common") &&
			subDirectories.includes("contracts") &&
			subDirectories.includes("packages")) {
			return ContentType.SIEM;
		}

		return undefined;
	}
}