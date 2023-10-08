import { Configuration } from '../models/configuration';
import { RuleBaseItem } from '../models/content/ruleBaseItem';

export interface CommandParams {
	config: Configuration;
	rule: RuleBaseItem;
	tmpDirPath?: string;
}


export abstract class Command {
	public abstract execute() : Promise<boolean>
}