import { Configuration } from '../configuration';
import { RuleBaseItem } from '../content/ruleBaseItem';

export interface CommandParams {
	config: Configuration;
	rule: RuleBaseItem;
	tmpDirPath?: string;
}

export abstract class Command {
	public abstract execute() : Promise<boolean>
}