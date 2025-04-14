import { useTranslations } from '~/hooks/use-translations';
import Button from '~/ui/button/button';
import Label from '~/ui/label/label';
import SettingBox from '~/ui/setting-box/setting-box';
import { state, useEditor } from '../../../store';
import styles from '../sources-and-tactics.module.scss';
import AttacksRow from './attacks-row';

function Attacks() {
  const translations = useTranslations();
  const { data, availableTactics } = useEditor();

  return (
    <SettingBox>
      <Label>{translations.MITRE}</Label>
      {Object.keys(data.attacks).map((index) => (
        <AttacksRow key={index} index={+index} />
      ))}
      <Button
        className={styles.button}
        isDisabled={availableTactics.length === 0}
        onClick={() => {
          state.data.attacks.push({
            Tactic: availableTactics[0],
            Techniques: []
          });
        }}
      >
        {translations.Add}
      </Button>
    </SettingBox>
  );
}

export default Attacks;
