import * as fs from 'fs';
import { Uri } from 'vscode';

import { API, Branch } from '../../@types/vscode.git';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { Configuration } from '../../models/configuration';

export class GitHooks {
	constructor(private _git : API, private _config: Configuration) {}

	public async update() {
		const currBranch = this.getCurrentBranch();
		
		// Первичное задание текущей ветке.
		const branchName = currBranch.name;
		if(!this._branchName) {
			this._branchName = branchName;

			// Первичное задание коммита.
			const commit = currBranch.commit;
			if(!this._commit) {
				this._commit = commit;
				return;
			}
		}

		// Смена ветки или коммита.
		const commit = currBranch.commit;
		if(this._branchName != branchName || this._commit != commit) {
			const outputDirectory = this._config.getBaseOutputDirectoryPath();
			if(fs.existsSync(outputDirectory)) {
				await FileSystemHelper.deleteAllSubDirectoriesAndFiles(outputDirectory);
			}
		}

		// Обновить данные.
		this._branchName = branchName;
		this._commit = commit;
	}

	public getCurrentBranch() : Branch {
		const kbPath = this._config.getKbFullPath();
		const repository = this._git.getRepository(Uri.file(kbPath));
		return repository.state.HEAD;
	}

	private _branchName: string;
	private _commit: string;
}
