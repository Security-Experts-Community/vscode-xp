import * as fs from 'fs';
import * as vscode from 'vscode';

import { VsCodeApiHelper } from '../../../helpers/vsCodeApiHelper';
import { ViewCommand } from '../../../models/command/command';
import { Configuration } from '../../../models/configuration';
import { Table } from '../../../models/content/table';
import { ContentTreeProvider } from '../contentTreeProvider';
import { ExceptionHelper } from '../../../helpers/exceptionHelper';
import { TableListsEditorViewProvider } from '../../tableListsEditor/tableListsEditorViewProvider';

export class OpenTableCommand extends ViewCommand {
  constructor(
    private config: Configuration,
    private table: Table
  ) {
    super();
  }

  public async execute(): Promise<void> {
    try {
      // Проверяем файл табличного списка
      const ruleFilePath = this.table.getFilePath();

      if (ruleFilePath && !fs.existsSync(ruleFilePath)) {
        // Попытка открыть несуществующий item
        // Возможно при переключении веток репозитория или ручной модификации репозитория.
        ContentTreeProvider.setSelectedItem(null);
        ContentTreeProvider.refresh();
        return;
      }

      // Открываем редактор структуры табличного списка.
      if (ruleFilePath) {
        vscode.commands.executeCommand(TableListsEditorViewProvider.showView, this.table);
        ContentTreeProvider.setSelectedItem(this.table);
        return;
      }
    } catch (error) {
      ExceptionHelper.show(
        error,
        `Ошибка во время открытия файла табличного списка по пути ${this.table.getFilePath()}`
      );
    }
  }
}
