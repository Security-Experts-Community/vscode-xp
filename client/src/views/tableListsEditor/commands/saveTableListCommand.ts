import * as fs from 'fs';

import { FileSystemHelper } from '../../../helpers/fileSystemHelper';
import { TableHelper } from '../../../helpers/tableHelper';
import { YamlHelper } from '../../../helpers/yamlHelper';
import { XpException } from '../../../models/xpException';
import { TableFieldView, TableListCommand, TableListMessage, TableView } from './tableListCommandBase';
import { DialogHelper } from '../../../helpers/dialogHelper';
import { TableListsEditorViewProvider } from '../tableListsEditorViewProvider';
import { Table, TableListType } from '../../../models/content/table';
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

		const jsonTableView = message.data;
		const tableObject = JSON.parse(jsonTableView) as TableView;

		if(!tableObject.name) {
			throw new XpException(`Не задано имя табличного списка. Задайте его и повторите`);
		}

		if(!tableObject.metainfo.ruDescription && !tableObject.metainfo.enDescription) {
			throw new XpException(`Не задано описание табличного списка. Задайте хотя бы описание на одном языке и повторите`);
		}

		if(tableObject.typicalSize && tableObject.maxSize && tableObject.typicalSize > tableObject.maxSize) {
			throw new XpException(`Не может быть типичный размер табличного списка больше максимального. Исправьте данные параметры и повторите`);
		}

		// Проверяем уникальность полей
		const columnNames = tableObject.fields.map(f => TableHelper.getFieldName(f));

		const duplicateColumnName = JsHelper.findDuplicates(columnNames);
		if(duplicateColumnName) {
			throw new XpException(`Имена колонок должны быть уникальными в рамках табличного списка. Колонка ${duplicateColumnName} дублируется`);
		}

		this._message = message;
	}

	async execute(webView: TableListsEditorViewProvider): Promise<boolean> {

		// Либо редактируем существующий табличный список, либо создаём новый.
		const tableObject = JSON.parse(this._message.data) as TableView;

		if(!tableObject?.fillType) {
			throw new XpException("Не задан тип табличного списка. Выберете тип из списка и повторите");
		}

		if(webView.getTable()) {
			// Редактируем существующий
			this._newTable = webView.getTable();

			// Имя табличного списка изменилось
			const newTableName = tableObject.name;
			if(this._newTable.getName() !== newTableName) {
				const prevTableDirPath = this._newTable.getDirectoryPath();
				if(fs.existsSync(prevTableDirPath)) {
					await fs.promises.rmdir(prevTableDirPath, {recursive: true});
				}

				this._newTable.setName(newTableName);
				this._newTable.getMetaInfo().setName(newTableName);
			}
		} else {
			// Создаем табличный список с нуля
			const parentItem = webView.getParentItem();
			this._newTable = Table.create(tableObject.name, tableObject.fillType, parentItem.getDirectoryPath());
		}

		// Сохраняем метаданные и удаляем их из данных FE.
		this._newTable.setRuDescription(tableObject.metainfo.ruDescription);
		this._newTable.setEnDescription(tableObject.metainfo.enDescription);
		delete tableObject.metainfo;

		this.convertKeysToYamlFormat(tableObject);
		await this.fillDefaultValues(webView, tableObject);
		await this.saveTableList(tableObject);

		// Дерево обновляем целиком, так как иначе не будет выделены все директории выше, относительно измененного объекта.
		ContentTreeProvider.refresh();

		if(webView.getTable()) {
			// TODO: добавить ссылку на сам файл, чтобы можно было сразу перейти к нему.
			DialogHelper.showWarning(
				"Табличный список сохранен. При изменении структуры табличного списка скорректируйте заполнение по умолчанию (defaults) файла table.tl");
			return true;
		}

		DialogHelper.showInfo("Табличный список сохранен");
		return true;
	}

	private getPrimaryKeysCount(tableObject: TableView) {
		let primaryKeyCount = 0;
		for(const field of tableObject.fields) {
			const fieldName = TableHelper.getFieldName(field);

			const primaryKey = field[fieldName].primaryKey as boolean;
			if(primaryKey) {
				primaryKeyCount++;
			}
		}

		return primaryKeyCount;
	}

	protected convertKeysToYamlFormat(tableObject: TableView) : void {
		// Если только одно поле, то complex_key не добавляем.
		const primaryKeyCount = this.getPrimaryKeysCount(tableObject);

		// Если ключевых полей больше 1го, то они должны быть занесены в complex_key, а свойство primaryKey у них должно быть сброшено.
		if(primaryKeyCount > 1) {
			const compositeFields: string[] = [];
			tableObject.fields.forEach((field, fieldIndex: number) => {
				const fieldName = TableHelper.getFieldName(field);

				const primaryKey = field[fieldName].primaryKey as boolean;
				if(primaryKey) {
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
			}
		}
	}

	protected async fillDefaultValues(webView : TableListsEditorViewProvider, tableObject: TableView) : Promise<void> {

		let prevTableData: TableView;
		if(webView.getTable()) {
			const prevTable = webView.getTable();
			const tableFilePath = prevTable.getFilePath();
			// Для редактирования существующих вьюшек, будем использовать некоторые значения из них.
			if(fs.existsSync(tableFilePath)) {
				const tableContent = await FileSystemHelper.readContentFile(tableFilePath);
				prevTableData = YamlHelper.parse(tableContent) as TableView;
			}
		}

		// Сохраняем заполнение по умолчанию, если оно было.
		if(prevTableData && JSON.stringify(prevTableData.defaults) !== "{}") {
			tableObject.defaults = prevTableData.defaults;

			// Количество столбцов изменилось, значит пользователь должен скорректировать дефолтное заполнение.
			// TODO: попытка сконвертировать заполнение по умолчанию.
			// let defaultsColumnCount = 0;
			// const ptDefaults = prevTableData.defaults?.["PT"];
			// const userDefaults = prevTableData.defaults?.["LOC"];
			// if(ptDefaults) {
			// 	const firstElement = ptDefaults?.[0];
			// 	if(firstElement) {
			// 		defaultsColumnCount = Object.keys(firstElement).length;
			// 	}
			// } 

			// if(userDefaults) {
			// 	const firstElement = userDefaults?.[0];
			// 	if(firstElement) {
			// 		defaultsColumnCount = Object.keys(firstElement).length;
			// 	}
			// }
		} else {
			tableObject.defaults = this.getDefaultsValue(tableObject);
		}
	}

	protected async saveTableList(tableObject: TableView) : Promise<void> {

		// Сохраняем в YAML
		const resultYamlTable = YamlHelper.tableStringify(tableObject);
		await this._newTable.setRuleCode(resultYamlTable);
		return this._newTable.save();
	}

	protected getDefaultsValue(tableObject: TableView) : any {
		switch(tableObject.fillType) {
			case TableListType.Registry:  {
				return {};
			}
			case TableListType.CorrelationRule: 
			case TableListType.EnrichmentRule:  {
				return undefined;
			}
			case TableListType.AssetGrid: 
			default: {
				throw new XpException("Данный тип табличного списка не поддерживается");
			}
		}
	}

	protected getMessage(): TableListMessage {
		return this._message;
	}

	private _message: TableListMessage;
	private _newTable: Table;

	static get commandName(): string {
		return "saveTableList";
	}
}