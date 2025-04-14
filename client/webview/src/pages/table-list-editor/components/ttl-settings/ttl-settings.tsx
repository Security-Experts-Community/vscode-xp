import { useMemo, useState } from 'react';
import { useSnapshot } from 'valtio';
import { useTranslations } from '~/hooks/use-translations';
import Checkbox from '~/ui/checkbox/checkbox';
import Label from '~/ui/label/label';
import SettingBox from '~/ui/setting-box/setting-box';
import Textfield from '~/ui/textfield/textfield';
import Tooltip from '~/ui/tooltip/tooltip';
import { state, useActions, useEditor } from '../../store';
import styles from './ttl-settings.module.scss';

function TTLSettings() {
  const {
    data: { ttl }
  } = useEditor();
  const translations = useTranslations();
  const { setTTL, parseTTL, toggleTTLUse } = useActions();
  const errors = useSnapshot(state.errors.general);
  const [isTTLUsed, setIsTTLUsed] = useState(!!ttl);
  const [_days, _hours, _minutes] = useMemo(() => parseTTL(ttl!), [ttl, parseTTL]);
  const [days, setDays] = useState(_days);
  const [hours, setHours] = useState(_hours);
  const [minutes, setMinutes] = useState(_minutes);

  const handleTTLUse = (isTTLUsed: boolean) => {
    toggleTTLUse(isTTLUsed);
    setIsTTLUsed(isTTLUsed);
  };

  const handleSetDays = (_days: string) => {
    const days = Number(_days || 0);
    setTTL(days, hours, minutes);
    setDays(days);
  };

  const handleSetHours = (_hours: string) => {
    const hours = Number(_hours || 0);
    setTTL(days, hours, minutes);
    setHours(hours);
  };

  const handleSetMinutes = (_minutes: string) => {
    const minutes = Number(_minutes || 0);
    setTTL(days, hours, minutes);
    setMinutes(minutes);
  };

  return (
    <SettingBox>
      <Label>{translations.TTL}</Label>
      <div className={styles.content}>
        <Checkbox
          label={translations.RestrictTTL}
          isChecked={isTTLUsed}
          onChange={() => handleTTLUse(!isTTLUsed)}
        />
        <div className={styles.form}>
          <Tooltip title={errors.ttlDays || errors.ttl} variant="error">
            <Textfield
              type="number"
              min={0}
              max={90}
              value={days}
              isDisabled={!isTTLUsed}
              isInvalid={!!(errors.ttlDays || errors.ttl)}
              onChange={handleSetDays}
            />
          </Tooltip>
          <span>{translations.TTLDays}</span>
          <Tooltip title={errors.ttlHours || errors.ttl} variant="error">
            <Textfield
              type="number"
              min={0}
              max={23}
              value={hours}
              isDisabled={!isTTLUsed}
              isInvalid={!!(errors.ttlHours || errors.ttl)}
              onChange={handleSetHours}
            />
          </Tooltip>
          <span>{translations.TTLHours}</span>
          <Tooltip title={errors.ttlMinutes || errors.ttl} variant="error">
            <Textfield
              type="number"
              min={0}
              max={59}
              value={minutes}
              isDisabled={!isTTLUsed}
              isInvalid={!!(errors.ttlMinutes || errors.ttl)}
              onChange={handleSetMinutes}
            />
          </Tooltip>
          <span>{translations.TTLMinutes}</span>
        </div>
      </div>
    </SettingBox>
  );
}

export default TTLSettings;
