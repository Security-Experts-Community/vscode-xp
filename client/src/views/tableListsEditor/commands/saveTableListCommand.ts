import * as fs from 'fs';

import { FileSystemHelper } from '../../../helpers/fileSystemHelper';
import { TableHelper } from '../../../helpers/tableHelper';
import { YamlHelper } from '../../../helpers/yamlHelper';
import { XpException } from '../../../models/xpException';
import { TableFieldView, TableListCommand, TableListMessage, TableView } from './tableListCommandBase';
import { DialogHelper } from '../../../helpers/dialogHelper';
import { TableListsEditorViewProvider } from '../tableListsEditorViewProvider';
import { Table } from '../../../models/content/table';
import { ContentTreeProvider } from '../../contentTree/contentTreeProvider';
import { JsHelper } from '../../../helpers/jsHelper';


export class SaveTableListCommand implements TableListCommand {
	public processMessage(message: TableListMessage): void {
		if(message.command !== SaveTableListCommand.commandName) {
			throw new XpException(`Вызвана некорректная команда ${message.command}`);
		}

		if(!message.data) {
			throw new XpException(`В команду ${SaveTableListCommand.commandName} не было передано поле 'data'`);
		}

		this._message = message;
	}

	async execute(webView: TableListsEditorViewProvider): Promise<boolean> {

		const jsonTableView = this._message.data;
		const tableObject = JSON.parse(jsonTableView) as TableView;

		// TODO: добавить валидацию обязательных данных, полученных с FE.
		if(!tableObject.name) {
			throw new XpException(`Не задано имя табличного списка. Задайте его и повторите`);
		}

		if(!tableObject.metainfo.ruDescription && !tableObject.metainfo.enDescription) {
			throw new XpException(`Не заданы описания табличного списка. Задайте их и повторите`);
		}

		// Проверяем уникальность полей
		const columnNames = tableObject.fields.map(f => {
			return  TableHelper.getFieldName(f);
		});

		const duplicateColumnName = JsHelper.findDuplicates(columnNames);
		if(duplicateColumnName) {
			throw new XpException(`Имена колонок должны быть уникальными в рамках табличного списка. Колонка ${duplicateColumnName} дублируется`);
		}

		let oldTable: TableView;
		if(webView.getTable()) {
			const tableFilePath = webView.getTable().getFilePath();
			// Для редактирования существующих вьюшек, будем использовать некоторые значения из них.
			if(fs.existsSync(tableFilePath)) {
				const tableContent = await FileSystemHelper.readContentFile(tableFilePath);
				oldTable = YamlHelper.parse(tableContent) as TableView;
			}
		}

		// Если только одно поле, то complex_key не добавляем.
		let primaryKeyCount = 0;
		for(const field of tableObject.fields) {
			const fieldName = TableHelper.getFieldName(field);

			const primaryKey = field[fieldName].primaryKey;
			// TODO: string должна превратиться в boolean
			if(primaryKey === "true") {
				primaryKeyCount++;
			}
		}

		let commonColumnCount = 0;
		if(primaryKeyCount > 1) {
			const compositeFields: string[] = [];
			tableObject.fields.forEach((field, fieldIndex: number) => {
				const fieldName = TableHelper.getFieldName(field);

				// TODO: string должна превратиться в boolean
				const primaryKey = field[fieldName].primaryKey;
				if(primaryKey === "true") {
					compositeFields.push(fieldName);
	
					const fieldView = (field[fieldName] as TableFieldView);
					fieldView.primaryKey = false;
				}

				// Если имеется complex_key, то первое поле не может быть индексируемым
				// BUILD_TABLES_SCHEMA :: [ERROR] Table "Table": Field "role" is the first item of the "complex_key" compositeFields
				if(fieldIndex === 0) {
					const fieldView = (field[fieldName] as TableFieldView);
					fieldView.index = false;
				}
			});

			const firstField = tableObject.fields?.[0];
			let prevIndex = false;
			if(firstField) {
				const firstFieldName = TableHelper.getFieldName(firstField);
				// Сохраняем index из исходного ТСа.
				// При создании index = false.
				if(firstFieldName === "complex_key") {
					prevIndex = firstField[firstFieldName].index;
				}
			}

	
			// Собираем ключевые поля complex_key если в таблице больше одного ключевого поля.
			const complexKey = {
				"complex_key": {
					"index": prevIndex,
					"nullable": false,
					"primaryKey": true,
					"type": "composite",
					"unique": true,
					"compositeFields": compositeFields
				}
			};

			const fieldsCopy = Object.assign({}, tableObject.fields);
			// Пересобираем поля с ключом 
			delete tableObject.fields;
	
			tableObject.fields = [];
			tableObject.fields.push(complexKey);
			for(const fieldIndex in fieldsCopy) {
				// Такого поля во вьюшке нет, по умолчанию оно false.
				const fieldName = TableHelper.getFieldName(fieldsCopy[fieldIndex]);
				fieldsCopy[fieldIndex][fieldName].unique = false;
				tableObject.fields.push(fieldsCopy[fieldIndex]);
				commonColumnCount++;
			}
		}

		// Если есть дефолтные значения их сохраняем, либо заполняем пустым списком.
		let defaultsManualCorrection = false;
		if(oldTable && JSON.stringify(oldTable.defaults) !== "{}") {
			// Количество столбцов изменилось, значит пользователь должен скорректировать дефолтное заполнение.
			// TODO: реализовать процедуру миграции.
			tableObject.defaults = oldTable.defaults;

			let defaultsColumnCount = 0;
			const ptDefaults = oldTable.defaults?.["PT"];
			const userDefaults = oldTable.defaults?.["LOC"];
			if(ptDefaults) {
				const firstElement = ptDefaults?.[0];
				if(firstElement) {
					defaultsColumnCount = Object.keys(firstElement).length;
				}
			} 

			if(userDefaults) {
				const firstElement = userDefaults?.[0];
				if(firstElement) {
					defaultsColumnCount = Object.keys(firstElement).length;
				}
			}

			if(defaultsColumnCount != commonColumnCount) {
				defaultsManualCorrection = true;
			}
		} else {
			tableObject.defaults = this.getDefaultsValue(tableObject.fillType);
		}

		// Либо редактируем существующий табличный список, либо создаём новый.
		let table: Table;
		if(webView.getTable()) {
			table = webView.getTable();
			table.setName(tableObject.name);
		} else {
			const parentItem = webView.getParentItem();
			table = Table.create(tableObject.name, parentItem.getDirectoryPath());
		}

		// Сохраняем метаданные и удаляем их из запроса.
		table.setRuDescription(tableObject.metainfo.ruDescription);
		table.setEnDescription(tableObject.metainfo.enDescription);

		// Удаляем то, чего не должно быть в результирующем файле
		delete tableObject.metainfo;

		// Сохраняем в YAML
		const resultYamlTable = YamlHelper.tableStringify(tableObject);
		table.setRuleCode(resultYamlTable);
		await table.save();

		// TODO: добавить обновление только родительского элемента созданного ТС.
		ContentTreeProvider.refresh();

		if(oldTable && defaultsManualCorrection) {
			DialogHelper.showWarning("Табличный список сохранен, но необходимо вручную скорректировать заполнения по умолчанию (defaults) так как количество колонок изменилось");
			return true;
		}

		if(oldTable && !defaultsManualCorrection && JSON.stringify(oldTable.defaults) !== "{}") { 
			DialogHelper.showWarning("Табличный список сохранен, проверьте корректность заполнения по умолчанию (defaults)");
			return true;
		}

		DialogHelper.showInfo("Табличный список сохранен");
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