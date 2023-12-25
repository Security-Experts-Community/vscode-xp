import '@bendera/vscode-webview-elements/dist/vscode-button/index.js';
import '@bendera/vscode-webview-elements/dist/vscode-textfield/index.js';

import Events from './components/events';
import Header from './components/header';
import Results from './components/results';
import { MessageProvider } from './providers/message-provider';
import { ThemeProvider } from './providers/theme-provider';

function App() {
    return (
        <MessageProvider>
            <ThemeProvider>
                <div className="grid h-full w-full min-w-[360px] grid-cols-1 grid-rows-2 gap-3">
                    <section className="col-span-1 row-span-1 flex max-h-full w-full flex-auto flex-col gap-2">
                        <Header />
                        <Events />
                    </section>
                    <section className="col-span-1 row-span-1 max-h-full w-full">
                        <Results />
                    </section>
                </div>
            </ThemeProvider>
        </MessageProvider>
    );
}

export default App;
