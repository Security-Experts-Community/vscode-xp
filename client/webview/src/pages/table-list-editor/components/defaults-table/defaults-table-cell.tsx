import { memo } from 'react';
import { useSnapshot } from 'valtio';
import { DefaultsKey } from '~/types';
import Editable from '~/ui/editable/editable';
import Tooltip from '~/ui/tooltip/tooltip';
import { state, useActions, useEditor } from '../../store';
import styles from './defaults-table.module.scss';

interface DefaultsTableCellProps {
  defaultsKey: DefaultsKey;
  recordId: string;
  columnName: string;
  isPrimary: boolean;
}

function DefaultsTableCell({
  defaultsKey,
  recordId,
  columnName,
  isPrimary
}: DefaultsTableCellProps) {
  const { searchString } = useEditor();
  const { updateDefaultValue } = useActions();
  const { values } = useSnapshot(state.data.defaults[defaultsKey].get(recordId)!);
  const errors = useSnapshot(state.errors.defaults[defaultsKey]);
  const duplicatedMessage = errors[`duplicated/${recordId}`];
  const validationError = errors[`${recordId}/${columnName}`];
  const duplicatedPrimaryKeyMessage = isPrimary ? duplicatedMessage : '';
  const isInvalid = !!(duplicatedPrimaryKeyMessage || validationError);

  const handleChange = (value: string) => {
    updateDefaultValue(defaultsKey, recordId, columnName, value);
  };

  return (
    <Tooltip title={validationError || duplicatedPrimaryKeyMessage} variant="error">
      <Editable
        className={styles.cell}
        value={values[columnName] || ''}
        searchString={searchString}
        isInvalid={isInvalid}
        onChange={handleChange}
      />
    </Tooltip>
  );
}

export default memo(DefaultsTableCell);
