import '@bendera/vscode-webview-elements/dist/vscode-button/index.js';
import '@bendera/vscode-webview-elements/dist/vscode-icon/index.js';

import usePostMessage from '../hooks/use-post-message';

export default function Header() {
    const { postRunTest, postSaveTest, postUpdateExpectation } = usePostMessage();
    return (
        <header className="flex w-full items-start gap-2">
            <vscode-button secondary className="flex flex-row justify-end gap-1" onClick={postRunTest}>
                Запустить
            </vscode-button>
            <vscode-button onClick={postSaveTest}>Сохранить</vscode-button>
            <vscode-button onClick={postUpdateExpectation}>Заменить ожидаемое событие фактическим</vscode-button>
        </header>
    );
}
