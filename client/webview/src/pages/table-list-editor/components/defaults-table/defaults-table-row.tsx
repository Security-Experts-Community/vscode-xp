import clsx from 'clsx';
import { memo } from 'react';
import { DefaultsKey } from '~/types';
import ActionButton from '~/ui/action-button/action-button';
import { useActions, useEditor } from '../../store';
import DefaultsTableCell from './defaults-table-cell';
import styles from './defaults-table.module.scss';

interface DefaultsTableRowProps {
  defaultsKey: DefaultsKey;
  recordId: string;
}

function DefaultsTableRow({ defaultsKey, recordId }: DefaultsTableRowProps) {
  const { deleteDefaultValue } = useActions();
  const {
    data: { columns }
  } = useEditor();

  const handleRowDelete = () => {
    deleteDefaultValue(defaultsKey, recordId);
  };

  return (
    <div key={recordId} className={styles.row}>
      {columns.map((column) => (
        <DefaultsTableCell
          key={column.id}
          defaultsKey={defaultsKey}
          recordId={recordId}
          columnName={column.name}
          isPrimary={column.data.primaryKey}
        />
      ))}
      <div className={clsx(styles.cell, styles.controlsCell)}>
        <ActionButton iconId="trash" onClick={handleRowDelete} />
      </div>
    </div>
  );
}

export default memo(DefaultsTableRow);
