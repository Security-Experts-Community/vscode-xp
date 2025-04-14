import { memo, useMemo } from 'react';
import { useTranslations } from '~/hooks/use-translations';
import Icon from '~/ui/icon/icon';
import Textfield from '~/ui/textfield/textfield';
import { throttle } from '~/utils';
import { useActions, useEditor } from '../../store';
import styles from './defaults-table.module.scss';

function DefaultsTableSearchForm() {
  const translations = useTranslations();
  const { searchString } = useEditor();
  const { setSearchString } = useActions();
  const handleSearch = useMemo(() => throttle(setSearchString, 200), [setSearchString]);

  return (
    <div className={styles.search}>
      <Icon className={styles.searchIcon} id="search" />
      <Textfield
        className={styles.searchField}
        value={searchString}
        placeholder={`${translations.Search}..`}
        onChange={handleSearch}
      />
    </div>
  );
}

export default memo(DefaultsTableSearchForm);
