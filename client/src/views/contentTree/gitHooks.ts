import * as fs from 'fs';
import { Uri } from 'vscode';

import { API, Branch } from '../../@types/vscode.git';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { Configuration } from '../../models/configuration';
import { Log } from '../../extension';
import { ContentTreeProvider } from './contentTreeProvider';

export class GitHooks {
	constructor(private _git : API, private _config: Configuration) {}

	/**
	 * 
	 * @returns обновлено ли дерево
	 */
	public async update() : Promise<boolean> {
		const currBranch = this.getCurrentBranch();
		if(!currBranch) {
			return;
		}
		
		// Первичное задание текущей ветке.
		let returnResult = false;
		const branchName = currBranch.name;
		if(!this._branchName) {
			this._branchName = branchName;

			// Первичное задание коммита.
			const commit = currBranch.commit;
			if(!this._commit) {
				this._commit = commit;
				return returnResult;
			}
		}

		// Смена ветки или коммита.
		const commit = currBranch.commit;
		
		if(this._branchName != branchName || this._commit != commit) {
			// Очистить директорию артефактов
			const outputDirectory = this._config.getBaseOutputDirectoryPath();
			if(fs.existsSync(outputDirectory)) {
				await FileSystemHelper.deleteAllSubDirectoriesAndFiles(outputDirectory);
				Log.info(`Выходная директория '${outputDirectory} была очищена после смены ветки в git`);
			}

			// Обновить дерево.
			await ContentTreeProvider.refresh();
			Log.info(`Дерево контента было обновлено`);
			returnResult = true;
		}

		// Обновить данные.
		this._branchName = branchName;
		this._commit = commit;
		return returnResult;
	}

	public getCurrentBranch() : Branch {
		const kbPath = this._config.getKbFullPath();
		const repository = this._git.getRepository(Uri.file(kbPath));
		return repository?.state?.HEAD;
	}

	private _branchName: string;
	private _commit: string;
}
