import * as path from 'path';

/**
 * Дефолтная базовая директория XP-инструментов (KBT) внутри Docker-контейнера.
 * Единый источник истины: используется и в Configuration, и в раннерах, чтобы
 * дефолт не приходилось держать синхронно в нескольких местах.
 */
export const DEFAULT_CONTAINER_KBT_BASE_DIRECTORY = '/home/coder/xp-kbt';

interface KbtToolLayout {
  /** Относительный путь до утилиты внутри контейнера (POSIX). */
  container: string;
  /** Сегменты относительного пути до утилиты на хосте. */
  localSegments: string[];
  /** Нужно ли добавлять расширение .exe на Windows. */
  appendExeOnWindows: boolean;
}

/**
 * Единый реестр относительных путей до утилит KBT. Раскладка утилит задаётся здесь
 * один раз, чтобы Configuration и раннеры (local/docker) не расходились.
 */
const KBT_TOOL_LAYOUT: Record<string, KbtToolLayout> = {
  kbtools: {
    container: 'kbtools',
    localSegments: ['kbtools'],
    appendExeOnWindows: false
  },
  siemj: {
    container: 'extra-tools/siemj/siemj',
    localSegments: ['extra-tools', 'siemj', 'siemj'],
    appendExeOnWindows: true
  },
  normalize: {
    container: 'build-tools/normalize',
    localSegments: ['build-tools', 'normalize'],
    appendExeOnWindows: true
  }
};

/** Сегменты пути до каталога CLI-утилит SDK относительно базовой директории KBT. */
const KBT_SDK_CLI_SEGMENTS = ['xp-sdk', 'cli'];

export type KbtToolName = keyof typeof KBT_TOOL_LAYOUT;

/** Каталог CLI-утилит SDK на хосте. */
export function getLocalSdkCliDirectory(kbtBaseDirectory: string): string {
  return path.join(kbtBaseDirectory, ...KBT_SDK_CLI_SEGMENTS);
}

/**
 * Некоторые поставки xp-kbt приезжают с CLI-бинарями внутри `xp-sdk/cli`, у которых не
 * выставлен бит исполнения (например, `frontend-cli`, который siemj дёргает на шаге
 * локализации). Из-за этого тесты локализации падают с `Permission denied`, хотя siemj
 * и остальные утилиты запускаются. Команда проставляет +x тем файлам каталога CLI,
 * у которых его нет.
 */
export function getNormalizeToolPermissionsShellCommand(kbtBaseDirectory: string): string {
  const cliDirectory = path.posix.join(kbtBaseDirectory, ...KBT_SDK_CLI_SEGMENTS);
  const quotedCliDirectory = `'${cliDirectory.replace(/'/g, `'\\''`)}'`;

  return `if [ -d ${quotedCliDirectory} ]; then find ${quotedCliDirectory} -maxdepth 1 -type f ! -perm -111 -exec chmod a+x {} +; fi`;
}

/** Относительный путь до утилиты внутри контейнера (POSIX). */
export function getContainerToolRelativePath(tool: KbtToolName): string {
  return KBT_TOOL_LAYOUT[tool].container;
}

/** Относительный путь до утилиты на хосте с учётом ОС (расширение .exe на Windows). */
export function getLocalToolRelativePath(tool: KbtToolName): string {
  const layout = KBT_TOOL_LAYOUT[tool];
  const segments = [...layout.localSegments];

  if (layout.appendExeOnWindows && process.platform === 'win32') {
    segments[segments.length - 1] = `${segments[segments.length - 1]}.exe`;
  }

  return path.join(...segments);
}
