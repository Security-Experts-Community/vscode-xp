import * as vscode from 'vscode';

import { RuleBaseItem } from '../../../models/content/ruleBaseItem';
import { ContentTreeProvider } from '../contentTreeProvider';
import { Configuration } from '../../../models/configuration';
import { NameValidator } from '../../../models/nameValidator';
import { Macros } from '../../../models/content/macros';
import { ViewCommand } from './viewCommand';

export class CreateMacroCommand extends ViewCommand {

	public constructor(private config: Configuration, private parentItem: RuleBaseItem) {
		super();
	}

	public async execute() : Promise<void> {

		const userInput = await vscode.window.showInputBox(
			{
				ignoreFocusOut: true,
				placeHolder: this.config.getMessage("MacroName"),
				prompt: this.config.getMessage("MacroName"),
				validateInput: (v) => {
					return NameValidator.validate(v, this.parentItem, this.config);
				}
			}
		);

		if(!userInput) {
			return;
		}

		const name = userInput.trim();
		const parentPath = this.parentItem.getDirectoryPath();
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
		await ContentTreeProvider.refresh(this.parentItem);
		await ContentTreeProvider.selectItem(rule);
	}
}
