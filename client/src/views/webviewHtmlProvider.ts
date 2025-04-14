import * as vscode from 'vscode';

type PageName =
  | 'meta-info-editor'
  | 'unit-test-editor'
  | 'table-list-editor'
  | 'create-rule-editor'
  | 'localization-editor'
  | 'full-graph-run-editor'
  | 'integration-test-editor';

class WebviewHtmlProvider {
  // Returns text content of `index.html` file for the webviews in React:
  // - In development mode loads bundle files from the local Vite dev server
  // - In production mode loads bundle files from `client/webview/out/assets`
  public async getWebviewHtml(
    pageName: PageName,
    extensionBaseUri: string,
    translations?: Record<string, string>
  ): Promise<string> {
    const isDevelopmentMode = process.env.MODE == 'development';

    const headTags = isDevelopmentMode
      ? this._getDevelopmentModeHeadTags()
      : this._getProductionModeHeadTags(extensionBaseUri);

    const configuration = await vscode.workspace.getConfiguration();

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <script type="module">
            window.__webview = {
              extensionRootUri: ${JSON.stringify(extensionBaseUri)},
              initialPage: ${JSON.stringify(pageName)},
              translations: ${JSON.stringify(translations)},
              monacoEditorConfiguration: ${JSON.stringify(configuration.editor)},
              getChunkPath: (filename) => window.__webview.webviewRootUri + "/out/" + filename
            };
          </script>
          ${headTags}
          <link href="${extensionBaseUri}/client/webview/node_modules/@vscode/codicons/dist/codicon.css" rel="stylesheet" />
        </head>
        <body>
          <div id="root"></div>
        </body>
      </html>
    `;
  }

  private _getDevelopmentModeHeadTags() {
    // TODO: Very rare case, but Vite can try another ports, if 5173 is already in use
    const devServerUrl = 'http://localhost:5173';

    return `
      <base href="${devServerUrl}" />
      <script type="module">
        import RefreshRuntime from "/@react-refresh";
        RefreshRuntime.injectIntoGlobalHook(window);
        window.__vite_plugin_react_preamble_installed__ = true;
        window.__webview.webviewRootUri = "${devServerUrl}";
      </script>
      <script type="module" src="/@vite/client"></script>
      <script type="module" src="/src/main.tsx"></script>
    `;
  }

  private _getProductionModeHeadTags(extensionBaseUri) {
    const assetsUri = `${extensionBaseUri}/client/webview/out/assets`;
    const baseUri = `${extensionBaseUri}/client/webview/out`;

    return `
      <base href="${baseUri}" />
      <link rel="stylesheet" href="${assetsUri}/index.css" />
      <script type="module" src="${assetsUri}/index.js" defer></script>
      <script type="module">
        window.__webview.webviewRootUri = "${extensionBaseUri}/client/webview";
      </script>
    `;
  }
}

export default new WebviewHtmlProvider();
