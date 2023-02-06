import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

import { KbHelper } from '../../../helpers/kbHelper';
import { RuleBaseItem } from '../../../models/content/ruleBaseItem';
import { ContentTreeProvider } from '../contentTreeProvider';
import { FileSystemHelper } from '../../../helpers/fileSystemHelper';
import { Configuration } from '../../../models/configuration';

export class CreatePackageCommand {

	static CommandName = "SiemContentEditor.сreatePackageCommand";

	public async execute(selectedItem: RuleBaseItem) {

		const userInput = await vscode.window.showInputBox(
			{
				ignoreFocusOut: true,
				placeHolder: 'Имя пакета',
				prompt: 'Имя пакета',
				validateInput: (v) => {
					const trimed = v.trim();
					// Корректность имени директории с точки зрения ОС.
					if(trimed.includes(">") || trimed.includes("<") || trimed.includes(":") || trimed.includes("\"") || trimed.includes("/") || trimed.includes("|") || trimed.includes("?") || trimed.includes("*"))
						return "Имя пакета содержит недопустимые символы";

					if(trimed === '')
						return "Имя пакета не должно быть пусто";

					// Не используем штатные директории контента.
					const contentSubDirectories = KbHelper.getContentSubDirectories();
					if(contentSubDirectories.includes(trimed))
						return "Данное имя пакета зарезервировано и не может быть использовано";

					// Английский язык
					const englishAlphabet = /^[a-z0-9_]*$/;
					if(!englishAlphabet.test(trimed)) {
						return "Допустимы только строчные английские буквы, цифры и символ подчёркивания";
					}

					// Невозможность создать уже созданную директорию.
					const newFolderPath = path.join(selectedItem.getParentPath(), trimed);
					if(fs.existsSync(newFolderPath))
						return "Данный пакет уже существует";
				}
			}
		);

		if(!userInput) {
			return;
		}

		const packageName = userInput.trim();
		const selectedItemDirPath = selectedItem.getDirectoryPath();

		// Пакет
		const newPackagePath = path.join(selectedItemDirPath, packageName);
		await fs.promises.mkdir(newPackagePath);

		const aggregationPath = path.join(newPackagePath, "aggregation_rules");
		await fs.promises.mkdir(aggregationPath);

		const normalizationPath = path.join(newPackagePath, "normalization_formulas");
		await fs.promises.mkdir(normalizationPath);

		const correlationPath = path.join(newPackagePath, "correlation_rules");
		await fs.promises.mkdir(correlationPath);

		const enrichmentPath = path.join(newPackagePath, "enrichment_rules");
		await fs.promises.mkdir(enrichmentPath);

		const tablesPath = path.join(newPackagePath, "tabular_lists");
		await fs.promises.mkdir(tablesPath);

		// Пакет -> _meta
		const metaPath = path.join(newPackagePath, "_meta");
		await fs.promises.mkdir(metaPath);

		// Пакет -> _meta -> metainfo.yaml
		const metainfoPath = path.join(metaPath, "metainfo.yaml");

		const contentPrefix = Configuration.get().getContentPrefix();
		const objectId = KbHelper.generatePackageObjectId(packageName, contentPrefix);
		const defaultMetainfoObject = {
			ObjectId: objectId,
			Version: "1.0.0"
		};
		const defaultMetainfoContent = yaml.stringify(defaultMetainfoObject);
		await FileSystemHelper.writeContentFile(metainfoPath, defaultMetainfoContent);

		await vscode.commands.executeCommand(ContentTreeProvider.refreshTreeCommmand);
	}
}
