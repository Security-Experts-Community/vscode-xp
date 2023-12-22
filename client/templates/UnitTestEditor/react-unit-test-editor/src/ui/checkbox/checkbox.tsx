import '@bendera/vscode-webview-elements/dist/vscode-checkbox';

type Props = {
    setIsCheckedState: (value: React.SetStateAction<boolean>) => void;
    label: string;
    disabled?: boolean;
};

export default function Checkbox({ setIsCheckedState, label }: Props) {
    const onInput = (e: React.FormEvent) => {
        e.currentTarget.ariaChecked == 'true' ? setIsCheckedState(true) : setIsCheckedState(false);
    };

    return <vscode-checkbox label={label} onInput={onInput}></vscode-checkbox>;
}
