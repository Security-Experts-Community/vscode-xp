import { ExtensionState } from '../models/applicationState';
import { ViewCommand } from '../views/contentTree/commands/viewCommand';
import { DialogHelper } from './dialogHelper';
import { ExceptionHelper } from './exceptionHelper';

export class CommandHelper {
	/**
	 * Не позволяет запускать команды, использующие сборку артефактов параллельно.
	 * @param command 
	 * @param defaultError 
	 * @returns 
	 */
	public static async singleExecutionCommand(command: ViewCommand, defaultError?: string): Promise<void> {
		if (ExtensionState.get().isExecutedState()) {
			DialogHelper.showError("Дождитесь окончания выполняющихся процессов и повторите. Если ошибка остаётся, то перезапустите VSCode");
			return;
		}

		try {
			ExtensionState.get().startExecutionState();
			await command.execute();
		}
		catch (error) {
			ExceptionHelper.show(error, defaultError ?? `Ошибка выполнения команды '${command}'`);
		}
		finally {
			ExtensionState.get().stopExecutionState();
		}
	}
}