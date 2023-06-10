import * as fs from 'fs';
import * as path from 'path';

import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { ProcessHelper } from '../../helpers/processHelper';
import { Configuration } from '../../models/configuration';
import { XpException } from '../../models/xpException';
import { SiemjConfBuilder } from '../../models/siemj/siemjConfigBuilder';

export class CorrGraphRunner {

	constructor(private _config : Configuration) {}

	public async run(correlationsFullPath: string, rawEventsFilePath: string) : Promise<string> {

		if(!fs.existsSync(rawEventsFilePath)) {
			throw new XpException(`Файл сырых событий '${rawEventsFilePath}' не доступен.`);
		}

		if(!fs.existsSync(correlationsFullPath)) {
			throw new XpException(`Директория контента '${correlationsFullPath}' не существует.`);
		}

		const rootPath = this._config.getRootByPath(correlationsFullPath);

		// В зависимости от типа контента получаем нужную выходную директорию.
		const rootFolder = path.basename(rootPath);
		const outputFolder = this._config.getOutputDirectoryPath(rootFolder);

		if(!fs.existsSync(outputFolder)) {
			await fs.promises.mkdir(outputFolder, {recursive: true});
		}
		
		const configBuilder = new SiemjConfBuilder(this._config, rootPath);
		configBuilder.addNormalizationsGraphBuilding(false);
		configBuilder.addTablesSchemaBuilding();
		configBuilder.addTablesDbBuilding();
		configBuilder.addCorrelationsGraphBuilding();
		configBuilder.addEnrichmentsGraphBuilding();

		configBuilder.addEventsNormalization(rawEventsFilePath);
		configBuilder.addEventsEnrichment();
		configBuilder.addCorrelateEnrichedEvents();

		const siemjConfContent = configBuilder.build();

		const randTmpDir = this._config.getRandTmpSubDirectoryPath(rootFolder);
		await fs.promises.mkdir(randTmpDir, {recursive: true});

		// Сохраняем конфигурационный файл для siemj.
		const siemjConfigPath = path.join(randTmpDir, "siemj.conf");
		const siemjExePath = this._config.getSiemjPath();
		await FileSystemHelper.writeContentFile(siemjConfigPath, siemjConfContent);

		// Без удаления базы возникали странные ошибки filler-а, но это не точно.
		const ftpaDbPath = this._config.getFptaDbFilePath(rootFolder);
		if(fs.existsSync(ftpaDbPath)) {
			await fs.promises.unlink(ftpaDbPath);
		}
		
		// Удаляем скорреклированные события, если такие были.
		const corrEventFilePath = this._config.getCorrelatedEventsFilePath(rootFolder);
		if(fs.existsSync(corrEventFilePath)) {
			await fs.promises.unlink(corrEventFilePath);
		}

		// Типовая команда выглядит так:
		// "C:\\PTSIEMSDK_GUI.4.0.0.738\\tools\\siemj.exe" -c C:\\PTSIEMSDK_GUI.4.0.0.738\\temp\\siemj.conf main");
		const result = await ProcessHelper.executeWithArgsWithRealtimeOutput(
			siemjExePath,
			["-c", siemjConfigPath, "main"],
			this._config.getOutputChannel());

		const corrEventsFilePath = this._config.getCorrelatedEventsFilePath(rootFolder);
		if(!fs.existsSync(corrEventsFilePath)) {
			throw new XpException("Ошибка прогона события на графе корреляций.");
		}
		
		const normEventsContent = await FileSystemHelper.readContentFile(corrEventsFilePath);
		await fs.promises.unlink(siemjConfigPath);
		return normEventsContent;
	}
}
