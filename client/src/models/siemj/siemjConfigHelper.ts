import * as path from 'path';
import * as fs from 'fs';

import { Configuration } from '../configuration';
import { SiemjConfBuilder } from './siemjConfigBuilder';


export class SiemjConfigHelper {

	public static getBuildAllGraphs(config : Configuration ) : string[] {
		const contentRootPaths = config.getContentRoots();
		return contentRootPaths.map(rootPath => { 
			const rootFolder = path.basename(rootPath);
			const output_folder = config.getOutputDirectoryPath(rootFolder);
			if(!fs.existsSync(output_folder)) {
				fs.mkdirSync(output_folder, {recursive: true});
			}

			const configBuilder = new SiemjConfBuilder(config, rootPath);
			configBuilder.addNormalizationsGraphBuilding();
			configBuilder.addTablesSchemaBuilding();
			configBuilder.addTablesDbBuilding();
			configBuilder.addCorrelationsGraphBuilding();
			configBuilder.addEnrichmentsGraphBuilding();
	
			const siemjConfContent = configBuilder.build();
			return siemjConfContent;
		});
	}

	public static async saveSiemjConfig(siemjConfigContent: string, siemjConfigPath: string) : Promise<void> {
		// Проверяем, что директория для записи файла существует
		const siemjFolder = path.dirname(siemjConfigPath);
		if(!fs.existsSync(siemjFolder)) {
			fs.mkdirSync(siemjFolder, {recursive: true});
		}
		// Сохраняем конфигурационный файл для siemj.
		return fs.promises.writeFile(siemjConfigPath, siemjConfigContent);
	}

	/**
	 * Очищаем артефакты запуска siemj. Неоходимо для невозможности получения неактуальных данных из них.
	 */
	public static async clearArtifacts(config : Configuration) : Promise<void> {
		const roots = config.getContentRoots();

		for (const root of roots){
			const outputDirName = path.basename(root);

			const ftpdDbFilePath = config.getFptaDbFilePath(outputDirName);
			if(fs.existsSync(ftpdDbFilePath)) {
				await fs.promises.unlink(ftpdDbFilePath);
			}

			const normEventsFilePath = config.getNormalizedEventsFilePath(outputDirName);
			if(fs.existsSync(normEventsFilePath)) {
				await fs.promises.unlink(normEventsFilePath);
			}

			const enrichEventsFilePath = config.getEnrichedEventsFilePath(outputDirName);
			if(fs.existsSync(enrichEventsFilePath)) {
				await fs.promises.unlink(enrichEventsFilePath);
			}
		}
	}
}
