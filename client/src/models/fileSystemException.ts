import { XpException } from './xpException';

export class FileSystemException extends XpException {
  public constructor(message: string, path?: string, inner?: Error) {
    super(message, inner);
    this.path = path;
  }

  public getPath(): string {
    return this.path;
  }

  private path: string;

  public static kbtDirectoryToolNotFoundException(filePath: string): FileSystemException {
    return new FileSystemException(
      `По пути [${filePath}](file:///${filePath}) не найдена директория для Knowledge Base Toolkit (KBT). Проверьте корректность [пути к KBT](command:workbench.action.openSettings?["xpConfig.kbtBaseDirectory"]) или загрузите актуальную версию [отсюда](https://github.com/vxcontrol/xp-kbt/releases), распакуйте и задайте путь к директории [в настройках](command:workbench.action.openSettings?["xpConfig.kbtBaseDirectory"])`
    );
  }

  public static kbtToolNotFoundException(filePath: string, name: string): FileSystemException {
    return new FileSystemException(
      `По пути [${filePath}](file:///${filePath}) не найдена утилита ${name} из Knowledge Base Toolkit (KBT). Проверьте корректность [пути к KBT](command:workbench.action.openSettings?["xpConfig.kbtBaseDirectory"]) или загрузите актуальную версию [отсюда](https://github.com/vxcontrol/xp-kbt/releases), распакуйте и задайте путь к директории [в настройках](command:workbench.action.openSettings?["xpConfig.kbtBaseDirectory"])`
    );
  }
}
