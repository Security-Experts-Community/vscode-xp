import { memo } from 'react';
import { useSnapshot } from 'valtio';
import { useTranslations } from '~/hooks/use-translations';
import Label from '~/ui/label/label';
import SettingBox from '~/ui/setting-box/setting-box';
import Textfield from '~/ui/textfield/textfield';
import Tooltip from '~/ui/tooltip/tooltip';
import { state, useActions, useEditor } from '../../store';

function TableName() {
  const {
    data: { name }
  } = useEditor();
  const translations = useTranslations();
  const errors = useSnapshot(state.errors.general);
  const { setName } = useActions();

  return (
    <SettingBox>
      <Label isRequired>{translations.Name}</Label>
      <Tooltip title={errors.tableName} variant="error" position="bottom">
        <Textfield value={name} isInvalid={!!errors.tableName} onChange={setName} />
      </Tooltip>
    </SettingBox>
  );
}

export default memo(TableName);
