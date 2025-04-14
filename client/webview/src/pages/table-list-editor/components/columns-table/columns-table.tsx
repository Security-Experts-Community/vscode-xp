import clsx from 'clsx';
import { useMemo, useRef } from 'react';
import { useSnapshot } from 'valtio';
import { useTranslations } from '~/hooks/use-translations';
import Button from '~/ui/button/button';
import Icon from '~/ui/icon/icon';
import Label from '~/ui/label/label';
import SortableList from '~/ui/sortable-list/sortable-list';
import Tooltip from '~/ui/tooltip/tooltip';
import { state, useActions, useEditor } from '../../store';
import ColumnsTableRow from './columns-table-row';
import styles from './columns-table.module.scss';

function ColumnsTable() {
  const {
    data: { columns }
  } = useEditor();
  const translations = useTranslations();
  const scrollableRef = useRef<HTMLDivElement>(null);
  const { addColumn, moveColumn } = useActions();
  const columnIds = useMemo(() => columns.map(({ id }) => id), [columns]);
  const errors = useSnapshot(state.errors.columns);

  const handleColumnAdd = () => {
    requestAnimationFrame(() => {
      const inputs = scrollableRef.current?.querySelectorAll<HTMLInputElement>('input');
      if (inputs) {
        inputs[inputs.length - 1]?.focus();
      }
    });
    addColumn();
  };

  const primaryKeyHeaderCell = (
    <Label>
      <Icon id="key" size={14} /> {translations.PrimaryKey}
    </Label>
  );

  return (
    <div className={styles.root}>
      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.cell}></div>
          <div className={styles.cell}>
            <Label>{translations.Name}</Label>
          </div>
          <div className={styles.cell}>
            <Label>{translations.DataType}</Label>
          </div>
          <Tooltip
            title={errors.noPrimaryColumns ? errors.noPrimaryColumns : primaryKeyHeaderCell}
            position="top"
            variant={errors.noPrimaryColumns ? 'error' : 'info'}
          >
            <div className={clsx(styles.cell, !!errors.noPrimaryColumns && styles.isInvalid)}>
              {primaryKeyHeaderCell}
            </div>
          </Tooltip>
          <Tooltip title={<Label>{translations.Indexed}</Label>} position="top">
            <div className={styles.cell}>
              <Label>{translations.Indexed}</Label>
            </div>
          </Tooltip>
          <Tooltip title={<Label>{translations.Nullable}</Label>} position="top">
            <div className={styles.cell}>
              <Label>{translations.Nullable}</Label>
            </div>
          </Tooltip>
          <div className={styles.cell}></div>
        </header>
        <div ref={scrollableRef} className={styles.rows}>
          <SortableList
            itemIds={columnIds}
            itemClassName={styles.row}
            itemDraggedClassName={clsx(styles.row, styles.isDragging)}
            itemComponent={ColumnsTableRow}
            onDragEnd={moveColumn}
          />
        </div>
      </div>
      <footer className={styles.footer}>
        <Button onClick={handleColumnAdd}>{translations.AddColumn}</Button>
      </footer>
    </div>
  );
}

export default ColumnsTable;
