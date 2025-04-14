import { VscodeCheckbox } from '@vscode-elements/react-elements';

interface CheckboxProps {
  label?: string;
  isChecked: boolean;
  isDisabled?: boolean;
  onChange(isChecked: boolean): void;
}

function Checkbox({ label, isChecked, isDisabled, onChange }: CheckboxProps) {
  return (
    <VscodeCheckbox
      label={label}
      checked={isChecked}
      disabled={isDisabled}
      onChange={() => onChange(!isChecked)}
    />
  );
}

export default Checkbox;
