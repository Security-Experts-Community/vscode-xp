[![Documentation Status](https://readthedocs.org/projects/vscode-xp/badge/?version=latest)](https://vscode-xp.readthedocs.io/ru/latest/?badge=latest) [![Telegram chat](https://img.shields.io/static/v1?label=chat&message=Telegram&color=blue&logo=telegram)](https://t.me/s3curity_experts_community/75) [![en](https://img.shields.io/badge/lang-ru-green.svg)](https://github.com/Security-Experts-Community/vscode-xp/blob/develop/README.md)

# XP language support in Visual Studio Code

The [eXtraction and Processing (XP)](https://help.ptsecurity.com/en-US/projects/maxpatrol10/26.2/help/1566293515) language is used to create detection rules based on the analysis of events from endpoints, similar to [Sigma rules](https://github.com/SigmaHQ/sigma). In the XP language, you can develop rules for normalization, event aggregation, correlation and enrichment.

You can quickly start [here](./docs/GETTING_STARTED.en.md).

This extension was developed by [Dmitry Fedosov](https://github.com/DmitryOffsec) and [contributors](https://github.com/Security-Experts-Community/vscode-xp/graphs/contributors), it allows you to develop and test rules in VSCode and VSCodium, and publish them in the format required for your product.

Guide to working with the extension (partially outdated, updating process in progress): [https://vscode-xp.readthedocs.io/](https://vscode-xp.readthedocs.io/en/latest/)

## Main features

Expansion options:

- View and edit normalization, aggregation, correlation, enrichment and table list rules.
- Creation of correlation, enrichment and normalization rules from templates.
- View, edit, create integration and unit tests for correlation, enrichment and normalization rules.
- Run integration and unit tests for correlation, enrichment and normalization rules.
- Automatic addition of keywords, functions, typical XP language constructs and taxonomy fields.
- Static validation of source code for common errors.
- Filling in rules metadata.
- Creating and editing localization rules.
- Collection of rule graphs, schemas and database table lists.
- Checking the response of the entire correlation graph to unprocessed events.
- Unpacking and packaging of examination packages into KB format files.

**Note:** For some of these operations, the extension uses additional utilities that are available in [separate repository](https://github.com/vxcontrol/xp-kbt/releases).

### Using the VSCode XP Workspace Project

You can easily get a ready-made development environment for XP if you use the [VSCode XP Workspace](https://github.com/Security-Experts-Community/vscode-xp-workspace) project. Everything in it is collected in a single Docker container, and editing occurs through the web version of VSCode.
Details in the project repository.

### macOS Hybrid Mode

On macOS, the extension runs locally in normal VS Code: UI, tree views, editors, language features, webviews, commands and knowledgebase file access stay on the host filesystem. Only operations that require `xp-kbt`, `siemj`, `normalizer-cli` or build tools are executed inside a Docker container.

The backend can be any Docker container that has XP tools installed. [vscode-xp-workspace](https://github.com/g4n8g/vscode-xp-workspace) is a ready-made preset, but it is not required. The container must bind mount the same knowledgebase directory that is opened in local VS Code, for example:

- host: `/Users/alice/Work/knowledgebase`
- container: `/workspaces/knowledgebase`

When the extension starts in local macOS VS Code, it offers to configure the container backend. The wizard selects the local knowledgebase path, checks Docker, selects a running container or creates a new tools container, detects the container mount path, detects or asks for the KBT path, and saves settings. If xp-kbt is not found in the selected container, the wizard can download the latest `vxcontrol/xp-kbt` release, let you choose one of the recent releases, or use a manually entered KBT path. A new container is created from `mcr.microsoft.com/dotnet/sdk:8.0`, bind mounts the selected knowledgebase at `/workspaces/knowledgebase`, and then continues through the same KBT installation step.

If the automatic notification was dismissed or you want to rerun setup later, use the `XP: Configure macOS Container Backend` command from the Command Palette.

Temporary extension artifacts are stored in `tmp/xp-output` inside the local knowledgebase by default. Inside the container, the matching path is `xpConfig.docker.outputDirectoryPath`, which defaults to `/workspaces/knowledgebase/tmp/xp-output`.

Relevant settings:

- `xpConfig.toolExecutionMode`: `auto`, `local`, or `docker`
- `xpConfig.docker.containerName`
- `xpConfig.docker.workspaceHostPath`
- `xpConfig.docker.workspaceContainerPath`
- `xpConfig.docker.kbtBaseDirectory`
- `xpConfig.docker.outputDirectoryPath`
- `xpConfig.macos.showContainerSetupPrompt`

While the container is being created and KBT is being installed, the extension writes detailed progress to the `eXtraction and Processing` output channel. The setup notification includes a direct action to open that output.

Troubleshooting:

- Docker not installed: install and start Docker Desktop.
- Container not running: start a container with XP tools, choose an already running container in the wizard, or rerun the setup wizard and choose to create a new container.
- Path mapping failed: check that `workspaceHostPath` points to the local knowledgebase and `workspaceContainerPath` matches the bind mount in the container.
- Tool not found in container: run the setup wizard again and choose `Download latest xp-kbt`, `Choose xp-kbt version`, or check `xpConfig.docker.kbtBaseDirectory`.

## Event normalization

To write correlation rules, in general, you will need event normalization formulas. In our [open expertise repository](https://github.com/Security-Experts-Community/open-xp-rules) you can find basic normalization formulas. In the future there will be other types of rules in the XP language created by the community.

## For developers

The extension is being developed by the [Security Experts Community](https://github.com/Security-Experts-Community). You can take part in the project and contribute your expertise to it. The current list of project issues is published [in the issue list](https://github.com/Security-Experts-Community/vscode-xp/issues). The list of tasks can be found in a convenient form [in the repository project](https://github.com/orgs/Security-Experts-Community/projects/2/views/3).

### Compilation

To compile the extension:

1. Install [VSCode](https://code.visualstudio.com/).

2. Install [Node.js](https://nodejs.org/).

3. Create a local copy of the repository:

```
git clone https://github.com/Security-Experts-Community/vscode-xp
```

4. In the project root, run the `npm install` command.

### Repositories

Main on GitHub: [https://github.com/Security-Experts-Community/vscode-xp](https://github.com/Security-Experts-Community/vscode-xp)

Mirror on Codeberg: [https://codeberg.org/Security-Experts-Community/vscode-xp](https://codeberg.org/Security-Experts-Community/vscode-xp)

Mirror on GitFlic: [https://gitflic.ru/project/security-experts-community/vscode-xp](https://gitflic.ru/project/security-experts-community/vscode-xp)

### Compiling all parts of the project

To carry out development, you need to assemble a client, server, ui toolkit for old views and new views with embedded react, use the command `npm run compile`.

For the webview development use the command `npm run watch:webview` and launch the `Launch Client (Webview DEV)` configuration.

### Assembling the extension into an installation package

Before building the extension installation package (\*.vsix file), you need to run the command `npm install -g vsce` in the root of the project.

To build the extension installation package, run the command `vsce package -o vscode-xp.vsix` or run the `publish.py` script in the project root.

### If code changes are not updated during development

This is very rare, but it happens. We write `npm run package` and `npm run compile` one by one
