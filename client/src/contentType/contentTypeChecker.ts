import * as path from 'path';
import { EDRPathHelper } from '../models/locator/EDRPathLocator';
import { SIEMPathHelper } from '../models/locator/SIEMPathLocator';
import { ContentType } from './contentType';

export class ContentTypeChecker {

	public static getContentTypeBySubDirectories(subDirectories: string[]): ContentType | undefined {
		const EDRpathHelper = EDRPathHelper.get();
		const SIEMpathHelper = SIEMPathHelper.get(); 
		const EDRrequiredRootDirectories = EDRpathHelper.getRequiredRootDirectories().map(function(d) { 
			return d.split(path.sep)[0];
		}).filter((elem, index, self) => {
			return index === self.indexOf(elem);
		});
		const SIEMrequiredRootDirectories = SIEMpathHelper.getRequiredRootDirectories().map(function(d) { 
			return d.split(path.sep)[0];
		}).filter((elem, index, self) => {
			return index === self.indexOf(elem);
		});
		
		if (EDRrequiredRootDirectories.every(folder => subDirectories.includes(folder))) {
			return ContentType.EDR;
		}

		if (SIEMrequiredRootDirectories.every(folder => subDirectories.includes(folder))) {
			return ContentType.SIEM;
		}

		return undefined;
	}
}