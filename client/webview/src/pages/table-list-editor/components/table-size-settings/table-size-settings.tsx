import { useSnapshot } from 'valtio';
import { useTranslations } from '~/hooks/use-translations';
import HelperText from '~/ui/helper-text/helper-text';
import Label from '~/ui/label/label';
import SettingBox from '~/ui/setting-box/setting-box';
import Textfield from '~/ui/textfield/textfield';
import Tooltip from '~/ui/tooltip/tooltip';
import { state, useActions, useEditor } from '../../store';
import styles from '../general-settings/general-settings.module.scss';
import TTLSettings from '../ttl-settings/ttl-settings';

function TableSizeSettings() {
  const {
    data: { typicalSize, maxSize }
  } = useEditor();
  const translations = useTranslations();
  const { setTypicalSize, setMaxSize } = useActions();
  const errors = useSnapshot(state.errors.general);

  return (
    <>
      <div className={styles.splitBox}>
        <SettingBox>
          <Label isRequired>{translations.MaxSize}</Label>
          <HelperText>{translations.MaxSizeDescription}</HelperText>
          <Tooltip title={errors.maxSize} variant="error" position="bottom">
            <Textfield
              type="number"
              min={0}
              max={2 ** 31 - 1}
              className={styles.numberTextfield}
              value={maxSize}
              isInvalid={!!errors.maxSize}
              onChange={(value) => setMaxSize(value ? Number(value) : NaN)}
            />
          </Tooltip>
        </SettingBox>
        <SettingBox>
          <Label isRequired>{translations.TypicalSize}</Label>
          <HelperText>{translations.TypicalSizeDescription}</HelperText>
          <Tooltip title={errors.typicalSize} variant="error" position="bottom">
            <Textfield
              type="number"
              min={0}
              max={2 ** 31 - 1}
              className={styles.numberTextfield}
              value={typicalSize}
              isInvalid={!!errors.typicalSize}
              onChange={(value) => setTypicalSize(value ? Number(value) : NaN)}
            />
          </Tooltip>
        </SettingBox>
      </div>
      <TTLSettings />
    </>
  );
}

export default TableSizeSettings;
