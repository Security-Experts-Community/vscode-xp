import clsx from 'clsx';
import { useCallback, useMemo, useState, type ReactElement } from 'react';
import styles from './tabs.module.scss';

interface TabsProps<T> {
  data: {
    id: T;
    label: string;
    isInvalid?: boolean;
    isDisabled?: boolean;
    element: ReactElement;
  }[];
}

function Tabs<T extends string>({ data }: TabsProps<T>) {
  const [openedTab, setOpenedTab] = useState(0);

  const handleTabOpen = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    setOpenedTab(Number(e.currentTarget.dataset.index));
  }, []);

  const renderedButtons = useMemo(
    () =>
      data.map(({ label, isInvalid, isDisabled }, i) => {
        const isSelected = i === openedTab;
        return (
          <button
            key={i}
            data-index={i}
            className={clsx(
              styles.button,
              isSelected && styles.isSelected,
              isDisabled && styles.isDisabled,
              isInvalid && styles.isInvalid
            )}
            onClick={isDisabled ? undefined : handleTabOpen}
          >
            {label}
          </button>
        );
      }),
    [openedTab, data, handleTabOpen]
  );

  return (
    <div className={styles.root}>
      <div className={styles.buttons}>{renderedButtons}</div>
      <div className={styles.content}>{data[openedTab].element}</div>
    </div>
  );
}

export default Tabs;
