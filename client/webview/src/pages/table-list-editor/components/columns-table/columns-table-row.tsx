import clsx from 'clsx';
import { memo, useMemo } from 'react';
import { useSnapshot } from 'valtio';
import { useTranslations } from '~/hooks/use-translations';
import { TableListColumnType } from '~/types';
import ActionButton from '~/ui/action-button/action-button';
import Checkbox from '~/ui/checkbox/checkbox';
import Icon from '~/ui/icon/icon';
import Select from '~/ui/select/select';
import Textfield from '~/ui/textfield/textfield';
import Tooltip from '~/ui/tooltip/tooltip';
import { state, useActions, useEditor } from '../../store';
import styles from './columns-table.module.scss';

interface ColumnsTableItemProps {
  itemId: string;
  dragHandleListeners: Record<string, unknown>;
}

function ColumnsTableRow({ itemId: columnId, dragHandleListeners }: ColumnsTableItemProps) {
  const translations = useTranslations();
  const {
    data: { columns }
  } = useEditor();
  const { getColumnById, updateColumn, deleteColumn } = useActions();
  const column = useSnapshot(useMemo(() => getColumnById(columnId), [columnId, getColumnById]));
  const errors = useSnapshot(state.errors.columns);

  const columnTypes = useMemo(
    () =>
      [
        { value: 'String', label: translations.String },
        { value: 'Number', label: translations.Number },
        { value: 'DateTime', label: translations.DateTime },
        { value: 'Regex', label: translations.Regex }
      ] satisfies { value: TableListColumnType; label: string }[],
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Invalid column name error
  const invalidNameMessage = errors[`name/invalid/${columnId}`];
  // Duplicated column name error
  const duplicatedNameMessage = errors[`name/duplicated/${columnId}`];

  return (
    <>
      <div className={styles.cell}>
        <button className={clsx(styles.button, styles.resize)} {...dragHandleListeners}>
          <Icon id="gripper" size={14} />
        </button>
      </div>
      <div className={styles.cell}>
        <Tooltip
          title={invalidNameMessage || duplicatedNameMessage}
          variant="error"
          position="bottom"
        >
          <Textfield
            value={column.name}
            isInvalid={!!(invalidNameMessage || duplicatedNameMessage)}
            onChange={(columnName) => {
              updateColumn(columnId, columnName);
            }}
          />
        </Tooltip>
      </div>
      <div className={styles.cell}>
        <Select
          selectedValue={column.data.type}
          items={columnTypes}
          onSelect={(columnType) => {
            updateColumn(columnId, column.name, { type: columnType });
          }}
        />
      </div>
      <div className={styles.cell}>
        <Checkbox
          isChecked={column.data.primaryKey}
          onChange={(isPrimaryKey) => {
            updateColumn(columnId, column.name, { primaryKey: isPrimaryKey });
          }}
        />
      </div>
      <div className={styles.cell}>
        <Checkbox
          isChecked={column.data.index}
          // If the column is a part of a primary key, it should be indexable,
          // and it can't be changed
          isDisabled={column.data.primaryKey}
          onChange={(isIndexed) => {
            updateColumn(columnId, column.name, { index: isIndexed });
          }}
        />
      </div>
      <div className={styles.cell}>
        <Checkbox
          isChecked={column.data.nullable}
          // If the column is a part of a primary key, it should be non-nullable,
          // and it can't be changed
          isDisabled={column.data.primaryKey}
          onChange={(isNullable) => {
            updateColumn(columnId, column.name, { nullable: isNullable });
          }}
        />
      </div>
      <div className={styles.cell}>
        <ActionButton
          className={styles.deleteButton}
          iconId="trash"
          size={14}
          isDisabled={columns.length === 1}
          onClick={() => deleteColumn(columnId)}
        />
      </div>
    </>
  );
}

export default memo(ColumnsTableRow);
