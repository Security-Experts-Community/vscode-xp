import * as fs from 'fs';
import { API } from '../../@types/vscode.git';

import { Configuration } from '../../models/configuration';

export class GitHooks {
	constructor(private _gitAPI : API, private _config: Configuration) {}

	public async updateBranchName(branchName: string) {
		// Первичное задание текущей ветке.
		if(!this._branchName) {
			this._branchName = branchName;
			return;
		}

		// Смена ветки.
		if(this._branchName != branchName) {
			const outputDirectory = this._config.getOutputDirectoryPath("");
			await fs.promises.rmdir(outputDirectory, { recursive: true});
		}
	}

	private _branchName: string;
}