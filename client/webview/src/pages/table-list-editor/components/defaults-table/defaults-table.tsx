import { useVirtualizer } from '@tanstack/react-virtual';
import clsx from 'clsx';
import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import { useSnapshot } from 'valtio';
import { useTranslations } from '~/hooks/use-translations';
import { DefaultsKey } from '~/types';
import Button from '~/ui/button/button';
import CodeSpan from '~/ui/code-span/code-span';
import Icon from '~/ui/icon/icon';
import Label from '~/ui/label/label';
import Tooltip from '~/ui/tooltip/tooltip';
import { state, useActions, useEditor } from '../../store';
import DefaultsTableRow from './defaults-table-row';
import DefaultsTableSearchForm from './defaults-table-search-form';
import styles from './defaults-table.module.scss';

interface DefaultsTableProps {
  defaultsKey: DefaultsKey;
}

function DefaultsTable({ defaultsKey }: DefaultsTableProps) {
  const {
    data: { columns },
    searchString
  } = useEditor();
  const translations = useTranslations();
  const { addDefaultValue, getFilteredDefaultValueIds } = useActions();

  const rootRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLHeadingElement>(null);

  const defaults = useSnapshot(state.data.defaults[defaultsKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recordIds = useMemo(() => getFilteredDefaultValueIds(defaults), [defaults, searchString]);

  const rowVirtualizer = useVirtualizer({
    isScrollingResetDelay: 0,
    count: recordIds.length,
    getScrollElement: () => rowsRef.current,
    estimateSize: () => 26,
    overscan: 3
  });
  const virtualRows = rowVirtualizer.getVirtualItems();

  useLayoutEffect(() => {
    const templateColumns = 'minmax(120px, 1fr) '.repeat(columns.length) + '30px';
    rootRef.current?.style.setProperty('--grid-template-columns', templateColumns);
  }, [columns.length]);

  const handleRowAdd = () => {
    addDefaultValue(defaultsKey);
    setTimeout(() => {
      rowVirtualizer.scrollToIndex(recordIds.length, { align: 'end' });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          rowsRef.current
            ?.querySelector<HTMLDivElement>(`[data-index="${recordIds.length}"] [contenteditable]`)
            ?.focus();
        });
      });
    });
  };

  const handleRowsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft } = e.currentTarget;
    // Sync rows scroll with the header
    requestAnimationFrame(() => {
      if (headerRef.current) {
        headerRef.current.style.transform = `translate3d(-${scrollLeft}px, 0, 0)`;
      }
    });
  };

  return (
    <div ref={rootRef} className={styles.root}>
      <div className={styles.content}>
        <header ref={headerRef} className={styles.header}>
          <div className={clsx(styles.headerContent, styles.row)}>
            {columns.map((column) => {
              const renderedCell = (
                <Label>
                  {column.data.primaryKey && <Icon id="key" size={14} />} {column.name}{' '}
                  <CodeSpan>{column.data.type.toLowerCase()}</CodeSpan>
                </Label>
              );
              return (
                <Tooltip key={column.id} title={renderedCell} position="top">
                  <div className={styles.cell}>{renderedCell}</div>
                </Tooltip>
              );
            })}
          </div>
        </header>
        <div ref={rowsRef} className={styles.rows} onScroll={handleRowsScroll}>
          {recordIds.length === 0 && (
            <div className={styles.emptyRowsMessage}>{translations.EmptyDefaultsMessage}</div>
          )}
          {virtualRows.length > 0 && (
            <div
              className={styles.rowsInner}
              style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
            >
              <div
                className={styles.rowsScroller}
                style={{ transform: `translateY(${virtualRows[0].start}px)` }}
              >
                {virtualRows.map((virtualItem) => (
                  <div
                    key={virtualItem.key}
                    ref={(node) => {
                      setTimeout(() => {
                        if (node) {
                          rowVirtualizer.measureElement(node);
                        }
                      });
                    }}
                    data-index={virtualItem.index}
                  >
                    <DefaultsTableRow
                      key={recordIds[virtualItem.index]}
                      defaultsKey={defaultsKey}
                      recordId={recordIds[virtualItem.index]}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <footer className={styles.footer}>
        <div className={styles.footerControls}>
          <Tooltip position="top" title={searchString ? translations.AddRowWithActiveSearch : ''}>
            <div>
              <Button isDisabled={!!searchString} onClick={handleRowAdd}>
                {translations.AddRow}
              </Button>
            </div>
          </Tooltip>
        </div>
        <div className={styles.footerFilters}>
          <DefaultsTableSearchForm />
        </div>
      </footer>
    </div>
  );
}

export default memo(DefaultsTable);
