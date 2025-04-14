import { memo, useRef } from 'react';
import { useTranslations } from '~/hooks/use-translations';
import { MetaInfo, StringArrayKeys } from '~/types';
import Button from '~/ui/button/button';
import Label from '~/ui/label/label';
import SettingBox from '~/ui/setting-box/setting-box';
import { useActions, useEditor } from '../../store';
import styles from './general-settings-group.module.scss';
import GeneralSettingsItem from './general-settings-item';

export interface GeneralSettingsGroupProps {
  title: React.ReactNode;
  dataField: StringArrayKeys<MetaInfo>;
  isMultiline?: boolean;
}

function GeneralSettingsGroup({ title, dataField, isMultiline }: GeneralSettingsGroupProps) {
  const itemsRef = useRef<HTMLDivElement>(null);
  const translations = useTranslations();
  const { addFieldValue } = useActions();
  const { data } = useEditor();

  return (
    <SettingBox className={styles.root}>
      <Label>{title}</Label>
      <div ref={itemsRef} className={styles.items}>
        {Object.keys(data[dataField]).map((index) => (
          <GeneralSettingsItem
            key={index}
            dataField={dataField}
            index={+index}
            isMultiline={isMultiline}
          />
        ))}
      </div>
      <div className={styles.controls}>
        <Button
          onClick={() => {
            addFieldValue(dataField);
            requestAnimationFrame(() => {
              itemsRef.current
                ?.querySelector<HTMLInputElement>(
                  `:scope > *:last-child ${isMultiline ? 'textarea' : 'input'}`
                )
                ?.focus();
            });
          }}
        >
          {translations.Add}
        </Button>
      </div>
    </SettingBox>
  );
}

export default memo(GeneralSettingsGroup);
