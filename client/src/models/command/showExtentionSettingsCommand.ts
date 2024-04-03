import * as vscode from 'vscode';

import { Configuration } from '../configuration';
import { Command } from './command';
import { VsCodeApiHelper } from '../../helpers/vsCodeApiHelper';

export class ShowExtensionSettingsCommand extends Command {
	constructor(private config: Configuration) {
		super();
	}

	public async execute(): Promise<boolean> {
		VsCodeApiHelper.openExtensionSettings(this.config.getExtensionSettingsPrefix());
		return true;
	}
}