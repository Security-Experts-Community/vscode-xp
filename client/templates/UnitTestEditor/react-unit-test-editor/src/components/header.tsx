import '@bendera/vscode-webview-elements/dist/vscode-button/index.js';
import '@bendera/vscode-webview-elements/dist/vscode-icon/index.js';

export default function Header() {
    return (
        <header className="flex h-10 w-full items-start gap-4">
            <vscode-button secondary className="flex flex-row justify-end gap-1">
                Запустить
            </vscode-button>
            <vscode-button>Сохранить</vscode-button>
            <vscode-button>Обновить ожидаемое событие</vscode-button>
        </header>
    );
}
