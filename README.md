# Поддержка языка XP в Visual Studio Code

[![Documentation Status](https://readthedocs.org/projects/vscode-xp/badge/?version=latest)](https://vscode-xp.readthedocs.io/ru/latest/?badge=latest) [![Telegram chat](https://img.shields.io/static/v1?label=chat&message=Telegram&color=blue&logo=telegram)](https://t.me/s3curity_experts_community/75) [![Telegram chat](https://img.shields.io/matrix/vscode-xp:matrix.org?color=g&label=matrix&logo=matrix&logoColor=green)](https://matrix.to/#/#vscode-xp:matrix.org)

Язык [eXtraction and Processing (XP)](https://help.ptsecurity.com/projects/maxpatrol10/26.2/ru-RU/help/1566293515) используется для создания детектирующих правил на основе анализа событий c конечных точек. На языке XP вы можете разрабатывать правила нормализации событий, их корреляции и обогащения.

Настоящее расширение разработано [Dmitry Fedosov](https://github.com/DmitryOffsec) и [контрибьютерами](https://github.com/Security-Experts-Community/vscode-xp/graphs/contributors), оно позволяет разрабатывать и тестировать правила в VSCode и VSCodium, а также публиковать их в необходимый для вашего продукта формат.

Руководство по работе с расширением (частично устарела, идёт процесс актуализации): [https://vscode-xp.readthedocs.io/](https://vscode-xp.readthedocs.io/)

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

Чтобы вести разработку, нужно собрать клиент, сервер, ui тулкит для старых вью и новые вью со встраиванием реакта, используйте команду`npm run compile:all`.
При добавлении новых реакт приложений нужно обновить содержание скрипта `react:build:all` сборкой таких реакт приложений.

### Сборка расширения в установочный пакет

Перед сборкой установочного пакета расширения (\*.vsix-файл) вам нужно в корне проекта выполнить команду `npm install -g vsce`.

Чтобы собрать установочный пакет расширения, выполните команду `vsce package -o vscode-xp.vsix` или запустите скрипт `publish.py` в корне проекта.

### Прокидывание vscode ui toolkit в webview

Неактуально, так как новые вью разрабатываются со встраиванием React. Удалить этот пункт, когда перепишем все вью на React.

1. В провайдер webview добавляем `const webviewUri = this.getUri(this._view.webview, this._config.getExtensionUri(), ["client", "out", "ui.js"]);`

2. Прокидываем webviewUri в plain: `"WebviewUri": webviewUri`

3. В вебвью добавляем в раздел скриптов добавляем `<script type="module" src="{{WebviewUri}}"></script>`

4. Добавляем в вебвью любой компонент из [документации тулкита](https://github.com/microsoft/vscode-webview-ui-toolkit/blob/main/docs/components.md)

### Если не подтягиваются изменения кода в процессе разработки

Такое очень редко, но бывает. Поочередно прописываем `npm run package` и `npm run compile`
