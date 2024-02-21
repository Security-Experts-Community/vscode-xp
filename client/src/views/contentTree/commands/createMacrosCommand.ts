import * as vscode from 'vscode';

import { RuleBaseItem } from '../../../models/content/ruleBaseItem';
import { ContentTreeProvider } from '../contentTreeProvider';
import { Configuration } from '../../../models/configuration';
import { NameValidator } from '../../../models/nameValidator';
import { Macros } from '../../../models/content/macros';

export class CreateMacroCommand {

	static CommandName = "xp.contentTree.createMacroCommand";

	public constructor(private _config: Configuration) {}

	public async execute(parentItem: RuleBaseItem) : Promise<void> {

		const userInput = await vscode.window.showInputBox(
			{
				ignoreFocusOut: true,
				placeHolder: this._config.getMessage("MacroName"),
				prompt: this._config.getMessage("MacroName"),
				validateInput: (v) => {
					return NameValidator.validateMacro(v, parentItem, this._config);
				}
			}
		);

		if(!userInput) {
			return;
		}

		const name = userInput.trim();
		const parentPath = parentItem.getDirectoryPath();
		const rule = await Macros.create(name, parentPath);

		const metainfo = rule.getMetaInfo();
		metainfo.setName(name);

		const objectId = rule.generateObjectId();
		if(objectId) {
			metainfo.setObjectId(objectId);
		}

		// Добавляем команду на открытие.
		rule.setCommand({
			command: ContentTreeProvider.onRuleClickCommand,
			title: "Open File",
			arguments: [rule]
		});

		await rule.save();
		await ContentTreeProvider.refresh(parentItem);
		await ContentTreeProvider.selectItem(rule);
	}
}
