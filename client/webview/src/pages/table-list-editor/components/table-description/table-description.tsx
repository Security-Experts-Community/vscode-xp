import { useTranslations } from '~/hooks/use-translations';
import Label from '~/ui/label/label';
import SettingBox from '~/ui/setting-box/setting-box';
import Textarea from '~/ui/textarea/textarea';
import { useActions, useEditor } from '../../store';
import styles from './table-description.module.scss';

interface TableDescriptionProps {
  language: 'ru' | 'en';
}

function TableDescription({ language }: TableDescriptionProps) {
  const {
    data: { metainfo }
  } = useEditor();
  const translations = useTranslations();
  const { setDescription } = useActions();

  const value = metainfo[`${language}Description`];

  const handleChange = (description: string) => {
    setDescription(language, description);
  };

  return (
    <SettingBox className={styles.root}>
      <Label>{translations[`Description${language.toUpperCase()}`]}</Label>
      <Textarea value={value} onChange={handleChange} />
    </SettingBox>
  );
}

export default TableDescription;
