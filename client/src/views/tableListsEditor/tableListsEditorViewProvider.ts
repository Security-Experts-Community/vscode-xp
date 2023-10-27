import * as vscode from 'vscode';
import * as path from 'path';

import { DialogHelper } from '../../helpers/dialogHelper';
import { MustacheFormatter } from '../mustacheFormatter';
import { Configuration } from '../../models/configuration';
import { Table } from '../../models/content/table';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { YamlHelper } from '../../helpers/yamlHelper';
import { XpException } from '../../models/xpException';

export class TableListMessage {
	command: string;
	data?: string;
}

export interface TableFieldView {
	index: boolean;
	nullable: boolean,
	primaryKey: boolean,
	type: string,
	unique: boolean,
	compositeFields: string[];
}

export interface TableView {
	name: string;
	fillType: string;
	type: number;
	userCanEditContent: boolean;
	fields: any [];
	metainfo: {
		ruDescription: string;	
		enDescription: string;
		objectId: string;
	},
	defaults: any[];
}

export class TableListsEditorViewProvider {

	public static readonly viewId = 'TableListsEditorView';

	constructor(
		private readonly _templatePath: string,
		private readonly _config: Configuration
	) { }

	public static init(config: Configuration): void {

		const templateFilePath = path.join(
			config.getExtensionPath(), "client", "templates", "TableListEditor", "html", "TableListEditor.html");

		const provider = new TableListsEditorViewProvider(templateFilePath, config);

		config.getContext().subscriptions.push(
			vscode.commands.registerCommand(
				TableListsEditorViewProvider.showView,
				async (tableItem: Table) => provider.showView(tableItem)
			)
		);
	}

	public static showView = "TableListsEditorView.showView";
	public async showView(table: Table): Promise<void> {

		// Если открыта еще одна локализация, то закрываем её перед открытием новой.
		if (this._view) {
			this._view.dispose();
			this._view = undefined;
		}

		this._table = table;

		try {
			// Создать и показать панель.
			this._view = vscode.window.createWebviewPanel(
				TableListsEditorViewProvider.viewId,
				'Редактирование табличного списка',
				vscode.ViewColumn.One,
				{ retainContextWhenHidden: true });

			this._view.webview.options = {
				enableScripts: true
			};

			this._view.webview.onDidReceiveMessage(
				this.receiveMessageFromWebView,
				this
			);

			const resourcesUri = this._config.getExtensionUri();
			const extensionBaseUri = this._view.webview.asWebviewUri(resourcesUri);

			const webviewUri = this.getUri(this._view.webview, resourcesUri, ["client", "out", "ui.js"]);

			const templatePlainObject = {
				"ExtensionBaseUri": extensionBaseUri,
				"WebviewUri": webviewUri
			};

			// Подгружаем шаблон и шаблонизируем данные.
			const template = await FileSystemHelper.readContentFile(this._templatePath);
			const formatter = new MustacheFormatter(template);
			const htmlContent = formatter.format(templatePlainObject);

			this._view.webview.html = htmlContent;

			setTimeout(() => this.receiveMessageFromWebView({ command: "documentIsReady" }), 1000);
		}
		catch (error) {
			DialogHelper.showError(`Не удалось открыть правила локализации.`, error);
		}
	}

	private async receiveMessageFromWebView(message: TableListMessage): Promise<boolean> {
		switch (message.command) {
			case this.documentIsReady.name: {
				const result = await this.documentIsReady();
				return result;
			}
			case this.saveTableList.name: {
				const result = await this.saveTableList(message.data);
				return result;
			}
		}
	}

	private async documentIsReady(): Promise<boolean> {
		const tableJson = await this.tableToEditorJsonView(this._table);
		return this.saveTableList(tableJson);
		// return this.postMessage({
		// 	command: "setViewContent",
		// 	data: tableJson
		// });
	}

	public async saveTableList(jsonTableView: string): Promise<boolean> {
		const tableObject = JSON.parse(jsonTableView) as TableView;

		const compositeFields: string[] = [];
		for(const field of tableObject.fields) {
			const fieldName = this.getFieldName(field);
			if(field[fieldName].primaryKey) {
				compositeFields.push(fieldName);

				const fieldView = (field[fieldName] as TableFieldView);
				fieldView.primaryKey = false;
			}
		}

		// Собираем ключевые поля complex_key
		const complexKey = {
			"complex_key": {
				"index": false,
				"nullable": false,
				"primaryKey": true,
				"type": "composite",
				"unique": true,
				"compositeFields": compositeFields
			}
		};

		const oldFields = Object.assign({}, tableObject.fields);

		// Удаляем всё лишнее
		delete tableObject.fields;
		if(tableObject.metainfo) {
			delete tableObject.metainfo;
		}

		// Пересобираем поля с ключом 
		tableObject.fields = [];
		tableObject.fields.push(complexKey);
		for(const field in oldFields) {
			tableObject.fields.push(oldFields[field]);
		}

		// Возвращаем дефолтные данные из файла табличного списка
		const tableFilePath = this._table.getFilePath();
		const tableContent = await FileSystemHelper.readContentFile(tableFilePath);
		const oldTable = YamlHelper.parse(tableContent) as TableView;
		tableObject.defaults = oldTable.defaults;

		// Сохраняем в YAML
		const resultYamlTable = YamlHelper.tableStringify(tableObject);
		await FileSystemHelper.writeContentFileIfChanged(tableFilePath, resultYamlTable);

		return true;
	}

	private postMessage(message: TableListMessage): Thenable<boolean> {
		return this._view.webview.postMessage(message);
	}

	private getUri(webview: vscode.Webview, extensionUri: vscode.Uri, pathList: string[]) {
		return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...pathList));
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
		const columnName = this.getFieldName(firstColumn);
		if(!columnName) {
			throw new XpException("Представление табличного списка повреждено");
		}

		if(tableObject.defaults) {
			delete tableObject.defaults;
		}

		// Убираем complex_key и сохраняем имена ключевых столбцов
		const fieldNames: string [] = [];
		if(columnName === "complex_key") {
			tableObject.fields.shift();

			for(const field of tableObject.fields) {
				const fieldName = this.getFieldName(field);
				fieldNames.push(fieldName);
			}
		}

		// Проставляем свойство ключевого столбца.
		tableObject.fields.forEach( (field, index) => {
			const fieldName = this.getFieldName(field);
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

	private getFieldName(field: any): string {
		return Object.keys(field)[0];
	}

	private _table: Table;
	private _view?: vscode.WebviewPanel;
}