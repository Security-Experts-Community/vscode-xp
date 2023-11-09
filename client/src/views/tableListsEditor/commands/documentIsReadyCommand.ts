import { FileSystemHelper } from '../../../helpers/fileSystemHelper';
import { TableHelper } from '../../../helpers/tableHelper';
import { YamlHelper } from '../../../helpers/yamlHelper';
import { Table } from '../../../models/content/table';
import { XpException } from '../../../models/xpException';
import { TableFieldView, TableListCommand, TableListMessage, TableView } from './tableListCommandBase';
import { TableListsEditorViewProvider } from '../tableListsEditorViewProvider';

export class DocumentIsReadyCommand implements TableListCommand {
	public processMessage(message: TableListMessage): void {
		if(message.command !== DocumentIsReadyCommand.commandName) {
			throw new XpException(`Вызвана некорректная команда ${message.command}`);
		}
	}

	async execute(webView: TableListsEditorViewProvider): Promise<boolean> {
		const table = webView.getTable();
		const tableJson = await this.tableToEditorJsonView(table);

		return webView.postMessage({
			command: "setViewContent",
			data: tableJson
		});
	}

	public async tableToEditorJsonView(table: Table) : Promise<string> {
		if(!table) {
			return null;
		}

		// TODO: переделать иерархию контента для внесения данный функциональности внутрь Table
		const tableFullPath = table.getFilePath();
		const tableContent = await FileSystemHelper.readContentFile(tableFullPath);
		const tableObject = YamlHelper.parse(tableContent) as TableView;

		// Убираем complex_key.
		const firstColumn = tableObject.fields[0];
		const columnName = TableHelper.getFieldName(firstColumn);
		if(!columnName) {
			throw new XpException("Представление табличного списка повреждено");
		}

		if(tableObject.defaults) {
			delete tableObject.defaults;
		}

		// Убираем complex_key и сохраняем имена ключевых столбцов
		const fieldNames: string [] = [];
		if(columnName === "complex_key") {
			const columnProperties = tableObject.fields[0][columnName];
			const compositeFields = columnProperties.compositeFields as string [];
			tableObject.fields.shift();

			for(const field of tableObject.fields) {
				const fieldName = TableHelper.getFieldName(field);
				if(!compositeFields.includes(fieldName))
					continue;

				fieldNames.push(fieldName);
			}
		}

		// Проставляем свойство ключевого столбца из complex_key
		tableObject.fields.forEach( (field, index) => {
			const fieldName = TableHelper.getFieldName(field);
			if(fieldNames.includes(fieldName)) {
				const keyField = (tableObject.fields[index][fieldName] as TableFieldView);
				keyField.primaryKey = true;
			}
		});

		// Добавляем метаданные
		tableObject.metainfo = {
			ruDescription: table.getRuDescription(),
			enDescription: table.getEnDescription(),
			objectId: table.getMetaInfo().getObjectId()
		};
		
		const tableJson = JSON.stringify(tableObject);
		return tableJson;
	}

	static get commandName(): string {
		return "documentIsReady";
	}
}