import * as fs from 'fs';

import { FileSystemHelper } from '../../../helpers/fileSystemHelper';
import { TableHelper } from '../../../helpers/tableHelper';
import { YamlHelper } from '../../../helpers/yamlHelper';
import { Table } from '../../../models/content/table';
import { XpException } from '../../../models/xpException';
import { TableFieldView, TableListCommand, TableListMessage, TableView } from './tableListCommandBase';
import { WebViewProviderBase } from '../webViewProviderBase';


export class SaveTableListCommand implements TableListCommand {
	constructor(private _table: Table) {}

	public processMessage(message: TableListMessage): void {
		if(message.command !== SaveTableListCommand.commandName) {
			throw new XpException(`Вызвана некорректная команда ${message.command}`);
		}

		if(!message.data) {
			throw new XpException(`В команду ${SaveTableListCommand.commandName} не было передано поле 'data'`);
		}

		this._message = message;
	}

	async execute(webView: WebViewProviderBase): Promise<boolean> {
		const jsonTableView = this._message.data;
		const tableObject = JSON.parse(jsonTableView) as TableView;

		// Если только одно поле, то complex_key не добавляем.
		let primaryKeyCount = 0;
		for(const field of tableObject.fields) {
			const fieldName = TableHelper.getFieldName(field);
			if(field[fieldName].primaryKey) {
				primaryKeyCount++;
			}
		}

		if(primaryKeyCount > 1) {
			const compositeFields: string[] = [];
			for(const field of tableObject.fields) {
				const fieldName = TableHelper.getFieldName(field);
				if(field[fieldName].primaryKey) {
					compositeFields.push(fieldName);
	
					const fieldView = (field[fieldName] as TableFieldView);
					fieldView.primaryKey = false;
				}
			}
	
			// Собираем ключевые поля complex_key если в таблице больше одного ключевого поля.
			const complexKey = {
				"complex_key": {
					"index": true,
					"nullable": false,
					"primaryKey": true,
					"type": "composite",
					"unique": true,
					"compositeFields": compositeFields
				}
			};

			const oldFields = Object.assign({}, tableObject.fields);
			// Пересобираем поля с ключом 
			delete tableObject.fields;
	
			tableObject.fields = [];
			tableObject.fields.push(complexKey);
			for(const field in oldFields) {
				tableObject.fields.push(oldFields[field]);
			}
		}

		if(tableObject.metainfo) {
			// Сохраняем метаданные и удаляем их из запроса.
			this._table.setRuDescription(tableObject.metainfo.ruDescription);
			this._table.setEnDescription(tableObject.metainfo.enDescription);

			// Удаляем то, чего не должно быть в результирующем файле
			delete tableObject.metainfo;
		}

		if(tableObject.name) {
			this._table.setName(tableObject.name);
		}

		// Если есть дефолтные значения их сохраняем, либо заполняем пустым списком.
		const tableFilePath = this._table.getFilePath();
		if(fs.existsSync(tableFilePath)) {
			const tableContent = await FileSystemHelper.readContentFile(tableFilePath);
			const oldTable = YamlHelper.parse(tableContent) as TableView;
			tableObject.defaults = oldTable.defaults;
		} else {
			tableObject.defaults = this.getDefaultsValue(tableObject.fillType);
		}

		// Сохраняем в YAML
		const resultYamlTable = YamlHelper.tableStringify(tableObject);
		this._table.setRuleCode(resultYamlTable);
		this._table.save();
		return true;
	}

	private getDefaultsValue(fillType: string) : any {
		switch(fillType) {
			case 'Registry':  {
				return {};
			}
			case 'CorrelationRule': 
			case 'EnrichmentRule':  {
				return undefined;
			}
			case 'AssetGrid': 
			default: {
				throw new XpException("Данный тип табличного списка не поддерживается");
			}
		}
	}



	private _message: TableListMessage;

	static get commandName(): string {
		return "saveTableList";
	}
}