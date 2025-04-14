import * as vscode from 'vscode';
import { Configuration } from '../models/configuration';
import { PackSIEMAllPackagesAction } from '../views/contentTree/actions/packSIEMAllPackagesAction';
import { PackEDRAllPackagesAction } from '../views/contentTree/actions/packEDRPackageAction';

interface XPTaskDefinition extends vscode.TaskDefinition {
  mode: string;
  package?: string;
}

export class XPPackingTaskProvider implements vscode.TaskProvider {
  static Type = 'XP';

  constructor(private config: Configuration) {}

  public async provideTasks(): Promise<vscode.Task[]> {
    return this.getTasks();
  }

  public resolveTask(_task: vscode.Task): vscode.Task | undefined {
    const mode: string = _task.definition.mode;
    if (mode) {
      const definition: XPTaskDefinition = <any>_task.definition;
      return this.getTask(definition.mode, definition);
    }
    return undefined;
  }

  private getTasks(): vscode.Task[] {
    const mode = this.config.getContentType();
    const tasks = [];
    tasks.push(this.getTask(mode));
    return tasks;
  }

  private getTask(mode: string, definition?: XPTaskDefinition): vscode.Task {
    if (definition === undefined) {
      definition = {
        type: XPPackingTaskProvider.Type,
        mode: mode,
        task: mode
      };
    }
    const taskName = `Pack ${mode} content`;
    const kind: XPTaskDefinition = {
      type: XPPackingTaskProvider.Type,
      mode: mode,
      task: taskName
    };
    const task = new vscode.Task(
      kind,
      vscode.TaskScope.Workspace,
      taskName,
      XPPackingTaskProvider.Type,
      new vscode.CustomExecution(async (): Promise<vscode.Pseudoterminal> => {
        return new CustomBuildTaskTerminal(this.config, mode);
      })
    );
    task.group = vscode.TaskGroup.Build;
    return task;
  }
}

class CustomBuildTaskTerminal implements vscode.Pseudoterminal {
  private writeEmitter = new vscode.EventEmitter<string>();
  onDidWrite: vscode.Event<string> = this.writeEmitter.event;
  private closeEmitter = new vscode.EventEmitter<number>();
  onDidClose?: vscode.Event<number> = this.closeEmitter.event;

  constructor(
    private config: Configuration,
    private mode: string
  ) {}

  open(initialDimensions: vscode.TerminalDimensions | undefined): void {
    // At this point we can start using the terminal.
    this.doBuild(this.config);
  }

  close(): void {
    //
  }

  private async doBuild(config: Configuration): Promise<void> {
    this.writeEmitter.fire('----------------------------------------\r\n');
    this.writeEmitter.fire(`XP:: Run ${this.mode} Packing Task...\r\n`);
    this.writeEmitter.fire('----------------------------------------\r\n');
    let action;
    switch (this.mode) {
      case 'EDR':
        {
          action = new PackEDRAllPackagesAction(config);
        }
        break;
      case 'SIEM':
        {
          action = new PackSIEMAllPackagesAction(config);
        }
        break;
      default:
        throw new Error(`Unexpected XP Mode: ${this.mode}`);
    }

    for (const pack of config.getContentRoots()) {
      await action.run(pack, this.writeEmitter);
    }
    this.writeEmitter.fire('----------------------------------------\r\n');
    this.writeEmitter.fire(`XP:: ${this.mode} Packing Task finished!\r\n`);
    this.writeEmitter.fire('----------------------------------------\r\n');
    this.closeEmitter.fire(0);
    return undefined;
  }
}
