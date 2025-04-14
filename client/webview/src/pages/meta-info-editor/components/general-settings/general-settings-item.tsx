import { memo } from 'react';
import { useSnapshot } from 'valtio';
import { useTranslations } from '~/hooks/use-translations';
import ActionButton from '~/ui/action-button/action-button';
import Textarea from '~/ui/textarea/textarea';
import Textfield from '~/ui/textfield/textfield';
import Tooltip from '~/ui/tooltip/tooltip';
import { state, useActions, useEditor } from '../../store';
import { GeneralSettingsGroupProps } from './general-settings-group';
import styles from './general-settings-item.module.scss';

interface GeneralSettingsItem extends Pick<GeneralSettingsGroupProps, 'dataField' | 'isMultiline'> {
  index: number;
}

function GeneralSettingsItem({ dataField, isMultiline, index }: GeneralSettingsItem) {
  const { data } = useEditor();
  const translations = useTranslations();
  const { updateFieldValue, deleteFieldValue } = useActions();
  const errors = useSnapshot(state.errors.general);

  const InputComponent = isMultiline ? Textarea : Textfield;
  const errorMessage = errors[`${dataField}/${index}/required`];
  const value = data[dataField!][index];

  return (
    <div key={index} className={styles.item} data-index={index}>
      <Tooltip title={errorMessage} variant="error" position="bottom">
        <InputComponent
          value={value}
          isInvalid={!!errorMessage}
          onChange={(value) => {
            updateFieldValue(dataField!, index, value);
          }}
        />
      </Tooltip>
      <div className={styles.itemButtons}>
        <Tooltip title={translations.Delete} position="top">
          <ActionButton
            iconId="trash"
            onClick={() => {
              deleteFieldValue(dataField!, index);
            }}
          />
        </Tooltip>
      </div>
    </div>
  );
}

export default memo(GeneralSettingsItem);
