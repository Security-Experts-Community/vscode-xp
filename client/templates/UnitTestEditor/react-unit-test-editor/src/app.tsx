import { useState } from 'react';
import viteLogo from '/vite.svg';

import reactLogo from './assets/react.svg';

import '@bendera/vscode-webview-elements/dist/vscode-button/index.js';
import '@bendera/vscode-webview-elements/dist/vscode-textfield/index.js';

function App() {
    const [count, setCount] = useState(0);

    return (
        <div className="flex flex-col gap-4">
            <div>
                <a href="https://vitejs.dev" target="_blank">
                    <img src={viteLogo} className="logo" alt="Vite logo" />
                </a>
                <a href="https://react.dev" target="_blank">
                    <img src={reactLogo} className="logo react" alt="React logo" />
                </a>
            </div>
            <div className="card">
                <button onClick={() => setCount((count) => count + 1)}>count is {count}</button>
            </div>
            <p className="text-3xl font-bold underline">tailwind check</p>
            <vscode-button>Primary button</vscode-button>
            <vscode-button secondary>Secondary button</vscode-button>
            <vscode-textfield maxlength={4} type="number"></vscode-textfield>
            <vscode-textfield type="color"></vscode-textfield>
            <vscode-textfield type="date"></vscode-textfield>
            <vscode-textfield type="datetime-local"></vscode-textfield>
            <vscode-textfield type="email"></vscode-textfield>
            <vscode-textfield type="file"></vscode-textfield>
            <vscode-textfield type="month"></vscode-textfield>
            <vscode-textfield type="password"></vscode-textfield>
            <vscode-textfield type="search"></vscode-textfield>
            <vscode-textfield type="tel"></vscode-textfield>
            <vscode-textfield type="text"></vscode-textfield>
            <vscode-textfield type="time"></vscode-textfield>
            <vscode-textfield type="url"></vscode-textfield>
            <vscode-textfield type="week"></vscode-textfield>
        </div>
    );
}

export default App;
