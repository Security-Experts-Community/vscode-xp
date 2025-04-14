import clsx from 'clsx';
import { useHighlightedString } from '~/hooks/use-highlighted-string';
import styles from './select.module.scss';

interface SelectItemProps {
  value: string;
  label: string;
  isSelected: boolean;
  searchString?: string;
  onClick(e: React.MouseEvent): void;
  onMouseDown(e: React.MouseEvent): void;
}

function SelectItem({
  label,
  value,
  isSelected,
  searchString,
  onClick,
  onMouseDown
}: SelectItemProps) {
  return (
    <li
      className={clsx(styles.item, isSelected && styles.isSelected)}
      data-value={value}
      onClick={onClick}
      onMouseDown={onMouseDown}
    >
      <span>{useHighlightedString(label, searchString?.toLowerCase())}</span>
    </li>
  );
}

export default SelectItem;
