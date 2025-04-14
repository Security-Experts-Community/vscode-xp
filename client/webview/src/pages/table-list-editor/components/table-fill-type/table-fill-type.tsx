import { useMemo } from 'react';
import { useTranslations } from '~/hooks/use-translations';
import { TableListFillType } from '~/types';
import Label from '~/ui/label/label';
import Select from '~/ui/select/select';
import SettingBox from '~/ui/setting-box/setting-box';
import { useActions, useEditor } from '../../store';
import TableFillTypeSettings from './table-fill-type-settings';

function TableFillType() {
  const {
    data: { fillType }
  } = useEditor();
  const translations = useTranslations();
  const { setFillType } = useActions();

  const items = useMemo<{ value: TableListFillType; label: string }[]>(
    () => [
      { value: 'Registry', label: translations.SelectRegistry },
      { value: 'CorrelationRule', label: translations.SelectCorrelationRule },
      { value: 'EnrichmentRule', label: translations.SelectEnrichmentRule }
    ],
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <>
      <SettingBox>
        <Label isRequired>{translations.FillType}</Label>
        <Select selectedValue={fillType} items={items} onSelect={setFillType} />
      </SettingBox>
      <TableFillTypeSettings />
    </>
  );
}

export default TableFillType;
