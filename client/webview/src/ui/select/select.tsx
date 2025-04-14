import clsx from 'clsx';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Badge from '../badge/badge';
import Icon from '../icon/icon';
import SelectItem from './select-item';
import styles from './select.module.scss';

type SelectProps<T> = {
  className?: string;
  position?: 'top' | 'bottom';
  items: { value: T; label?: string }[];
  placeholder?: React.ReactNode;
  autoFocus?: boolean;
  emptyListMessage?: React.ReactNode;
  isSearchEnabled?: boolean;
  selectedMessageHandler?(selectedItemsCount: number): React.ReactNode;
  onSelect(selectedValue: T): void;
  onBlur?(): void;
} & (
  | {
      isMultiselect: true;
      selectedValue: T[];
    }
  | {
      isMultiselect?: false;
      selectedValue: T;
    }
);

function Select<T extends string>({
  className,
  selectedValue,
  position = 'bottom',
  items,
  placeholder = 'Choose value',
  autoFocus,
  emptyListMessage = 'Nothing found',
  isSearchEnabled = false,
  isMultiselect = false,
  selectedMessageHandler,
  onSelect,
  onBlur
}: SelectProps<T>) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchString, setSearchString] = useState('');
  const [isOpened, setIsOpened] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedValues, setSelectedValues] = useState(selectedValue);

  useLayoutEffect(() => {
    if (autoFocus) {
      setIsOpened(true);
      setIsFocused(true);
    }
  }, [autoFocus]);

  useLayoutEffect(() => {
    if (isOpened) {
      searchRef.current?.focus();
    } else {
      setSearchString('');
    }
    setSelectedValues(selectedValue);
  }, [isOpened, selectedValue]);

  useEffect(() => {
    const closeDropdown = (e: Event) => {
      if (dropdownRef.current) {
        // If clicked inside of a dropdown
        if (e.target != window && dropdownRef.current.contains(e.target as HTMLElement)) {
          return;
        }
      }
      setIsOpened(false);
      setIsFocused(false);
      onBlur?.();
    };

    document.addEventListener('mousedown', closeDropdown);

    if (isOpened) {
      document.addEventListener('scroll', closeDropdown);
      document.addEventListener('wheel', closeDropdown);
      window.addEventListener('resize', closeDropdown);
    }

    return () => {
      document.removeEventListener('mousedown', closeDropdown);
      document.removeEventListener('scroll', closeDropdown);
      document.removeEventListener('wheel', closeDropdown);
      window.removeEventListener('resize', closeDropdown);
    };
  }, [isMultiselect, isOpened, onBlur]);

  useLayoutEffect(() => {
    const anchorNode = anchorRef.current;
    const dropdownNode = dropdownRef.current;

    if (!isOpened || !dropdownNode || !anchorNode) {
      return;
    }

    const {
      top: anchorTop,
      left: anchorLeft,
      bottom: anchorBottom,
      width: anchorWidth,
      height: anchorHeight
    } = anchorNode.getBoundingClientRect();
    const { innerWidth: windowWidth, innerHeight: windowHeight } = window;
    const outlineWidth = 1;
    const maxDropdownHeight = 240;
    const autoPosition =
      Math.min(anchorTop, maxDropdownHeight) > windowHeight - anchorBottom ? 'top' : position;
    const maxHeight = Math.min(
      (autoPosition == 'top' ? anchorTop : windowHeight - anchorBottom) - outlineWidth,
      maxDropdownHeight
    );

    dropdownRef.current.style.minWidth = `${anchorWidth}px`;
    dropdownRef.current.style.maxHeight = `${maxHeight}px`;

    const { width: dropdownWidth, height: dropdownHeight } = dropdownNode.getBoundingClientRect();

    let deltaX = 0;
    let deltaY = 0;

    switch (autoPosition) {
      case 'top':
        deltaY -= dropdownHeight;
        break;
      case 'bottom':
        deltaY += anchorHeight;
        break;
    }

    const top = Math.max(0, Math.min(anchorTop + deltaY, windowHeight - dropdownHeight));
    const left = Math.max(0, Math.min(anchorLeft + deltaX, windowWidth - dropdownWidth));

    requestAnimationFrame(() => {
      if (dropdownRef.current) {
        dropdownRef.current.style.top = `${top}px`;
        dropdownRef.current.style.left = `${left}px`;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorRef.current, dropdownRef.current, position, isOpened, searchString]);

  const handleOpenToggle = () => {
    setIsFocused(!isOpened);
    setIsOpened(!isOpened);
  };

  const handleItemClick = (e: React.MouseEvent<HTMLLIElement>) => {
    onSelect(e.currentTarget.dataset.value as T);
    if (!isMultiselect) {
      setIsOpened(false);
      setIsFocused(false);
    }
  };

  const handleItemMousedown = (e: React.MouseEvent) => {
    if (!isMultiselect) {
      e.stopPropagation();
    }
  };

  const selectedLabel = useMemo(() => {
    if (isMultiselect) {
      if (!selectedValue.length) {
        return placeholder;
      }
      return selectedMessageHandler
        ? selectedMessageHandler(selectedValue.length)
        : (selectedValue as T[]).map((value) => (
            <Badge key={value} className={styles.rootBadge}>
              {value}
            </Badge>
          ));
    }
    const selectedItem = items.find(({ value }) => value === selectedValue);
    if (!selectedItem) {
      return placeholder;
    }
    return selectedItem.label ?? selectedItem.value;
  }, [items, selectedValue, placeholder, isMultiselect, selectedMessageHandler]);

  const renderedSelectedItem =
    isSearchEnabled && isFocused ? (
      <div
        className={styles.rootSearchItem}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Icon className={styles.rootSearchIcon} id="search" />
        <input
          ref={searchRef}
          className={styles.rootSearchInput}
          value={searchString}
          onChange={(e) => setSearchString(e.target.value)}
        />
      </div>
    ) : (
      <div className={styles.rootItem}>{selectedLabel}</div>
    );

  const filteredItems = useMemo(
    () =>
      searchString
        ? items.filter(({ value, label }) =>
            (label ?? value).toLowerCase().includes(searchString.toLowerCase())
          )
        : items,
    [items, searchString]
  );

  return (
    <>
      <div
        ref={anchorRef}
        className={clsx(styles.root, className, isFocused && styles.isFocused)}
        onClick={handleOpenToggle}
      >
        {renderedSelectedItem}
        <div className={styles.expandIcon}>
          <Icon id="chevron-down" />
        </div>
      </div>
      {isOpened &&
        createPortal(
          <div ref={dropdownRef} className={styles.dropdown}>
            <ul className={styles.items}>
              {filteredItems.length == 0 && (
                <span className={styles.emptyListMessage}>{emptyListMessage}</span>
              )}
              {filteredItems.map(({ value, label }) => {
                const isSelected = isMultiselect
                  ? selectedValues.includes(value)
                  : value === selectedValues;
                return (
                  <SelectItem
                    key={value}
                    value={value}
                    label={label ?? value}
                    isSelected={isSelected}
                    searchString={searchString}
                    onClick={handleItemClick}
                    onMouseDown={handleItemMousedown}
                  />
                );
              })}
            </ul>
          </div>,
          document.body
        )}
    </>
  );
}

export default Select;
