import '@bendera/vscode-webview-elements/dist/vscode-button/index.js';
import '@bendera/vscode-webview-elements/dist/vscode-textfield/index.js';

import ActualData from './components/actual-data';
import Expectation from './components/expectation';
import Header from './components/header';
import InputData from './components/input-data';
import { MessageProvider } from './providers/message-provider';
import { ThemeProvider } from './providers/theme-provider';

function App() {
    return (
        <MessageProvider>
            <ThemeProvider>
                <div className="grid h-full w-full min-w-[360px] grid-cols-1 grid-rows-2 gap-2 pt-2">
                    <section className="col-span-1 row-span-1 flex max-h-full w-full flex-auto flex-col gap-2">
                        <Header />
                        <InputData />
                    </section>
                    <section className="col-span-1 row-span-1 grid h-full max-h-full w-full grid-cols-2 gap-2">
                        <Expectation />
                        <ActualData />
                    </section>
                </div>
            </ThemeProvider>
        </MessageProvider>
    );
}

export default App;
