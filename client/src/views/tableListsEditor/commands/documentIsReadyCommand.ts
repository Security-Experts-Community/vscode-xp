import { FileSystemHelper } from '../../../helpers/fileSystemHelper';
import { TableHelper } from '../../../helpers/tableHelper';
import { YamlHelper } from '../../../helpers/yamlHelper';
import { Table } from '../../../models/content/table';
import { XpException } from '../../../models/xpException';
import {
  TableFieldView,
  TableListCommand,
  TableListMessage,
  TableView
} from './tableListCommandBase';
import { TableListsEditorViewProvider } from '../tableListsEditorViewProvider';

export class DocumentIsReadyCommand implements TableListCommand {
  public processMessage(message: TableListMessage): void {
    if (message.command !== DocumentIsReadyCommand.commandName) {
      throw new XpException(`Вызвана некорректная команда ${message.command}`);
    }
  }

  async execute(webView: TableListsEditorViewProvider): Promise<boolean> {
    const table = webView.getTable();

    let tableObject = {};
    // Либо открываем таблицу, либо передаем значения по умолчанию для новой.
    if (table) {
      tableObject = await this.tableToEditorJsonView(table);
    } else {
      tableObject = {
        name: '',
        type: 1,
        fillType: 'Registry',
        ttl: TableListsEditorViewProvider.DEFAULT_TTL_PER_SEC,
        maxSize: TableListsEditorViewProvider.DEFAULT_MAX_SIZE,
        typicalSize: TableListsEditorViewProvider.DEFAULT_TYPICAL_SIZE,
        metainfo: {
          ruDescription: '',
          enDescription: ''
        },
        fields: [
          {
            '': {
              type: 'String',
              primaryKey: true,
              index: true,
              nullable: false
            }
          }
        ],
        defaults: this._getEmptyDefaults()
      };
    }

    return webView.postMessage({
      command: 'TableListEditor.setState',
      payload: tableObject as TableView
    });
  }

  public async tableToEditorJsonView(table: Table): Promise<TableView> {
    if (!table) {
      return null;
    }

    // TODO: переделать иерархию контента для внесения данный функциональности внутрь Table
    const tableFullPath = table.getFilePath();
    const tableContent = await FileSystemHelper.readContentFile(tableFullPath);
    const tableObject = YamlHelper.parse(tableContent) as TableView;

    // Убираем complex_key.
    const firstColumn = tableObject.fields[0];
    const columnName = TableHelper.getFieldName(firstColumn);
    if (!columnName) {
      throw new XpException('Представление табличного списка повреждено');
    }

    tableObject.defaults = Object.assign(this._getEmptyDefaults(), tableObject.defaults);

    // Убираем complex_key и сохраняем имена ключевых столбцов
    const fieldNames: string[] = [];
    if (columnName === 'complex_key') {
      const columnProperties = tableObject.fields[0][columnName];
      const compositeFields = columnProperties.compositeFields as string[];
      tableObject.fields.shift();

      for (const field of tableObject.fields) {
        const fieldName = TableHelper.getFieldName(field);
        if (!compositeFields.includes(fieldName)) continue;

        fieldNames.push(fieldName);
      }
    }

    // Проставляем свойство ключевого столбца из complex_key
    tableObject.fields.forEach((field, index) => {
      const fieldName = TableHelper.getFieldName(field);
      if (fieldNames.includes(fieldName)) {
        const keyField = tableObject.fields[index][fieldName] as TableFieldView;
        keyField.primaryKey = true;
      }
    });

    // Добавляем метаданные
    tableObject.metainfo = {
      ruDescription: table.getRuDescription(),
      enDescription: table.getEnDescription(),
      objectId: table.getMetaInfo().getObjectId()
    };

    return tableObject;
  }

  private _getEmptyDefaults() {
    return {
      PT: [],
      LOC: []
    };
  }

  static get commandName(): string {
    return 'documentIsReady';
  }
}
