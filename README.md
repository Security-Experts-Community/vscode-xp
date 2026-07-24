[![Documentation Status](https://readthedocs.org/projects/vscode-xp/badge/?version=latest)](https://vscode-xp.readthedocs.io/ru/latest/?badge=latest) [![Telegram chat](https://img.shields.io/static/v1?label=chat&message=Telegram&color=blue&logo=telegram)](https://t.me/s3curity_experts_community/75) [![en](https://img.shields.io/badge/lang-en-green.svg)](README.en.md)

# Поддержка языка eXtraction and Processing (XP) в Visual Studio Code

Язык [eXtraction and Processing (XP)](https://help.ptsecurity.com/projects/maxpatrol10/26.2/ru-RU/help/1566293515) используется для создания детектирующих правил на основе анализа событий c конечных точек, подобно [Sigma-правилам](https://github.com/SigmaHQ/sigma). На языке XP вы можете разрабатывать правила нормализации, агрегации событий, их корреляции и обогащения.

Быстро ознакомиться с процессом создания правил можно [тут](./docs/GETTING_STARTED.md).

Настоящее расширение разработано [Dmitry Fedosov](https://github.com/DmitryOffsec) и [контрибьютерами](https://github.com/Security-Experts-Community/vscode-xp/graphs/contributors), оно позволяет разрабатывать и тестировать правила в VSCode и VSCodium, а также публиковать их в необходимый для вашего продукта формат.

Руководство по работе с расширением (частично устарела, идёт процесс актуализации): [https://vscode-xp.readthedocs.io/](https://vscode-xp.readthedocs.io/ru/latest/)

## Основные возможности

Возможности расширения:

- Просмотр и редактирование правил нормализации, агрегации, корреляции, обогащения и табличных списков.
- Создание из шаблонов правил корреляции, обогащения и нормализации.
- Просмотр, редактирование, создание интеграционных и модульных тестов для правил корреляции, обогащения и нормализации.
- Запуск интеграционных и модульных тестов для правил корреляции, обогащения и нормализации.
- Автоматическое дополнение ключевых слов, функций, типовых конструкций языка XP и полей таксономии.
- Статическая валидация исходного кода на типичные ошибки.
- Заполнение метаданных правил.
- Создание и редактирование правил локализации правил.
- Сбор графов правил, схемы и БД табличных списков.
- Проверка срабатываний всего графа корреляций на необработанные события.
- Распаковка и упаковка пакетов экспертизы в файлы формата KB.

**Примечание.** Для части этих операций расширение использует дополнительные утилиты, которые доступны в [отдельном репозитории](https://github.com/vxcontrol/xp-kbt/releases).

### Использование проекта VSCode XP Workspace

Вы можете легко получить готовое окружение для разработки на XP, если воспользуетесь проектом [VSCode XP Workspace](https://github.com/Security-Experts-Community/vscode-xp-workspace). В нём всё собрано в единый Docker-контейнер, а редактирование происходит через веб-версию VSCode.
Подробности в репозитории проекта.

### Быстрый старт на macOS

1. Установите и запустите **Docker Desktop**.
2. Откройте в VS Code папку с вашей knowledgebase (её корень — каталог, содержащий `packages`).
3. Установите расширение eXtraction and Processing.
4. Расширение само предложит настроить контейнерный backend — нажмите **Configure**. Если уведомление было пропущено, запустите команду `XP: Настроить контейнерный backend для macOS` из палитры команд.
5. Пройдите wizard: выберите папку knowledgebase, дайте проверить Docker, затем выберите уже запущенный контейнер с XP tools или создайте новый. Если `xp-kbt` в контейнере не найден, выберите `Download latest xp-kbt` (либо конкретную версию, либо укажите путь вручную).
6. Готово: операции сборки и тестирования выполняются через контейнер. Подробный прогресс виден в канале вывода `eXtraction and Processing`.

Подробнее о том, как всё устроено и какие настройки доступны, — в разделах ниже.

### Гибридный режим macOS

На macOS расширение запускается локально в обычном VS Code: UI, tree view, редакторы, language features, webviews, команды VS Code и чтение файлов knowledgebase остаются на файловой системе хоста. Только операции, которым нужны `xp-kbt`, `siemj`, `normalizer-cli` или build tools, выполняются внутри Docker-контейнера.

Backend может быть любым Docker-контейнером, в котором установлены XP tools. Контейнер должен видеть ту же knowledgebase через bind mount, например:

- host: `/Users/alice/Work/knowledgebase`
- container: `/workspaces/knowledgebase`

При запуске в локальном VS Code на macOS расширение предлагает настроить контейнерный backend. Wizard выбирает локальный путь к knowledgebase, проверяет Docker, выбирает запущенный контейнер или создаёт новый tools-контейнер, определяет container mount path, определяет или запрашивает путь к KBT и сохраняет настройки. Если xp-kbt не найден в выбранном контейнере, wizard может скачать latest release `vxcontrol/xp-kbt`, дать выбрать одну из доступных версий релизов или использовать вручную введённый путь к KBT. Новый контейнер создаётся на базе `mcr.microsoft.com/dotnet/sdk:8.0`, монтирует выбранную knowledgebase в `/workspaces/knowledgebase` и после создания проходит тот же шаг установки KBT.

Если автоматическое уведомление было скрыто или настройку нужно повторить позже, используйте команду `XP: Настроить контейнерный backend для macOS` из палитры команд.

**Как расширение ставит xp-kbt в контейнер.** Если вы разрешаете автоматическую загрузку, wizard скачивает `xp-kbt` прямо внутри контейнера: тянет нужный релиз с GitHub (`curl -fL <github-release-asset> | tar/unzip`), а если в контейнере не окажется `curl`, `tar` или `unzip` — доставит их через `apt-get`/`apk`. Прежде чем соглашаться, стоит понимать, что при этом:

- вы доверяете репозиторию [`vxcontrol/xp-kbt`](https://github.com/vxcontrol/xp-kbt/releases) и TLS-соединению с GitHub;
- контейнеру нужен доступ в сеть и права root;
- контрольная сумма скачанного архива пока не проверяется.

Если такой сценарий не вписывается в ваши требования по безопасности — установите `xp-kbt` в контейнер заранее сами и просто укажите путь в `xpConfig.docker.kbtBaseDirectory`. Тогда автоматическая загрузка не понадобится.

Временные артефакты расширения по умолчанию сохраняются в `tmp/xp-output` внутри локальной knowledgebase. В контейнере этому пути соответствует `xpConfig.docker.outputDirectoryPath`, по умолчанию `/workspaces/knowledgebase/tmp/xp-output`.

Основные настройки:

- `xpConfig.toolExecutionMode`: `auto`, `local` или `docker`
- `xpConfig.docker.containerName`
- `xpConfig.docker.workspaceHostPath`
- `xpConfig.docker.workspaceContainerPath`
- `xpConfig.docker.kbtBaseDirectory`
- `xpConfig.docker.outputDirectoryPath`
- `xpConfig.lspServerExecutablePath`
- `xpConfig.formatterExecutablePath`
- `xpConfig.macos.showContainerSetupPrompt`

Во время создания контейнера и установки KBT расширение пишет подробный прогресс в канал вывода `eXtraction and Processing`. Из уведомления setup wizard можно сразу открыть этот канал через ссылку на output.

Troubleshooting:

- Docker not installed: установите и запустите Docker Desktop.
- Container not running: запустите контейнер с XP tools, выберите уже запущенный контейнер в wizard или повторите setup wizard и выберите создание нового контейнера.
- Path mapping failed: проверьте, что `workspaceHostPath` указывает на локальную knowledgebase, а `workspaceContainerPath` совпадает с bind mount в контейнере.
- Tool not found in container: запустите setup wizard ещё раз и выберите `Download latest xp-kbt`, `Choose xp-kbt version`, либо проверьте `xpConfig.docker.kbtBaseDirectory`.
- Native LSP starts but reports schema warnings: запустите сценарий сборки, который генерирует table schema, например сборку/тест, включающий генерацию схемы, а затем при необходимости перезапустите или перезагрузите расширение.
- Native LSP на macOS не обязателен: если у вас нет нативного `evt-xp-language-server`, оставьте `xpConfig.lspServerExecutablePath` пустым. Docker-операции сборки и тестирования продолжат работать и без LSP-функций.

## Нормализация событий

Для написания правил корреляции, в общем случае, Вам потребуются формулы нормализации событий. В нашем [открытом репозитории с экспертизой](https://github.com/Security-Experts-Community/open-xp-rules) вы сможете найти базовые формулы нормализации. В будущем там появятся другие виды правил на языке XP, созданные сообществом.

## Разработчикам

Разработкой расширения занимается сообщество [Security Experts Community](https://github.com/Security-Experts-Community). Вы можете принять участие в проекте и внести в него свою экспертизу. Актуальный список задач проекта публикуется [в списке задач](https://github.com/Security-Experts-Community/vscode-xp/issues). В удобном виде со списком задач можно ознакомиться [в проекте репозитория](https://github.com/orgs/Security-Experts-Community/projects/2/views/3).

### Компиляция

Чтобы скомпилировать расширение:

1. Установите [VSCode](https://code.visualstudio.com/).

2. Установите [Node.js](https://nodejs.org/).

3. Создайте локальную копию репозитория:

```
git clone https://github.com/Security-Experts-Community/vscode-xp
```

4. В корне проекта выполните команду `npm install`.

### Репозитории

Основной на GitHub: [https://github.com/Security-Experts-Community/vscode-xp](https://github.com/Security-Experts-Community/vscode-xp)

Зеркало на Codeberg: [https://codeberg.org/Security-Experts-Community/vscode-xp](https://codeberg.org/Security-Experts-Community/vscode-xp)

Зеркало на GitFlic: [https://gitflic.ru/project/security-experts-community/vscode-xp](https://gitflic.ru/project/security-experts-community/vscode-xp)

### Компиляция всех частей проекта

Чтобы вести разработку, нужно собрать клиент, сервер, ui тулкит для старых вью и новые вью со встраиванием реакта, используйте команду`npm run compile`.

Для разработки webview выполните команду `npm run watch:webview` и запустите конфигурацию `Launch Client (Webview DEV)`.

### Сборка расширения в установочный пакет

Перед сборкой установочного пакета расширения (\*.vsix-файл) вам нужно в корне проекта выполнить команду `npm install -g vsce`.

Чтобы собрать установочный пакет расширения, выполните команду `vsce package -o vscode-xp.vsix` или запустите скрипт `publish.py` в корне проекта.

### Если не подтягиваются изменения кода в процессе разработки

Такое очень редко, но бывает. Поочередно прописываем `npm run package` и `npm run compile`
