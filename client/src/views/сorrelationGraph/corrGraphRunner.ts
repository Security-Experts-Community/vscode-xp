import * as fs from 'fs';
import * as path from 'path';

import { ExtensionHelper } from '../../helpers/extensionHelper';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { ProcessHelper } from '../../helpers/processHelper';
import { Configuration } from '../../models/configuration';
import { VsCodeApiHelper } from '../../helpers/vsCodeApiHelper';
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

		// В зависимости от типа контента получаем нужную выходную директорию.
		const root = this._config.getPathHelper().getRootByPath(correlationsFullPath);
		const rootFolder = path.basename(root);
		const outputFolder = this._config.getOutputDirectoryPath(rootFolder);

		if(!fs.existsSync(outputFolder)) {
			await fs.promises.mkdir(outputFolder);
		}
		
		const configBuilder = new SiemjConfBuilder(this._config);
		configBuilder.addNfgraphBuilding(false);
		configBuilder.addTablesSchemaBuilding();
		configBuilder.addTablesDbBuilding();
		configBuilder.addCfgraphBuilding();
		configBuilder.addEfgraphBuilding(false);

		configBuilder.addEventsNormalize(rawEventsFilePath);
		configBuilder.addEventsEnrich();
		configBuilder.addEventsCorrelate();
		
		const siemjConfContent = configBuilder.build();

		const randTmpDir = this._config.getRandTmpSubDirectoryPath();
		await fs.promises.mkdir(randTmpDir);

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
		const corrEventFilePath = this._config.getCorrEventsFilePath(rootFolder);
		if(fs.existsSync(corrEventFilePath)) {
			await fs.promises.unlink(corrEventFilePath);
		}

		// Типовая команда выглядит так:
		// "C:\\Work\\-=SIEM=-\\PTSIEMSDK_GUI.4.0.0.738\\tools\\siemj.exe" -c C:\\Work\\-=SIEM=-\\PTSIEMSDK_GUI.4.0.0.738\\temp\\siemj.conf main");
		const result = await ProcessHelper.ExecuteWithArgsWithRealtimeOutput(
			siemjExePath,
			["-c", siemjConfigPath, "main"],
			this._config.getOutputChannel());

		const corrEventsFilePath = this._config.getCorrEventsFilePath(rootFolder);
		if(!fs.existsSync(corrEventsFilePath)) {
			throw new XpException("Ошибка прогона события на графе корреляций.");
		}
		
		const normEventsContent = await FileSystemHelper.readContentFile(corrEventsFilePath);
		await fs.promises.unlink(siemjConfigPath);
		return normEventsContent;
	}
}
