import { Configuration } from '../configuration';
import { RuleBaseItem } from '../content/ruleBaseItem';
import { IntegrationTest } from '../tests/integrationTest';

export interface RuleCommandParams {
  config: Configuration;
  rule: RuleBaseItem;
  tmpDirPath?: string;
  message?: any;
}

export interface IntegrationTestParams extends RuleCommandParams {
  testNumber: number;
  test: IntegrationTest;
}

export abstract class ViewCommand {
  public abstract execute(): Promise<void>;
}

export abstract class Command {
  public abstract execute(): Promise<boolean>;
}
