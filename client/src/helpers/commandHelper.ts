import { ExtensionState } from '../models/applicationState';
import { ViewCommand } from '../models/command/command';
import { Configuration } from '../models/configuration';
import { DialogHelper } from './dialogHelper';
import { ExceptionHelper } from './exceptionHelper';

export class CommandHelper {
  /**
   * Не позволяет запускать команды, использующие сборку артефактов параллельно.
   * @param command
   * @param defaultError
   * @returns
   */
  public static async singleExecutionCommand(
    command: ViewCommand,
    defaultError?: string
  ): Promise<void> {
    if (ExtensionState.get().isExecutedState()) {
      DialogHelper.showWarning(Configuration.get().getMessage('WaitForCommandToFinishExecuting'));
      return;
    }

    try {
      ExtensionState.get().startExecutionState();
      await command.execute();
    } catch (error) {
      ExceptionHelper.show(error, defaultError ?? `Ошибка выполнения команды`);
    } finally {
      ExtensionState.get().stopExecutionState();
    }
  }
}
