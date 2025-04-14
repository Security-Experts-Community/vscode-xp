import { useMemo } from 'react';
import { useEditor } from '../../store';
import TableSizeSettings from '../table-size-settings/table-size-settings';
import styles from './table-fill-type-settings.module.scss';

function TableFillTypeSettings() {
  const {
    data: { fillType }
  } = useEditor();

  const renderedSettings = useMemo(() => {
    switch (fillType) {
      case 'CorrelationRule':
      case 'EnrichmentRule':
        return <TableSizeSettings />;

      default:
        return null;
    }
  }, [fillType]);

  return <div className={styles.root}>{renderedSettings}</div>;
}

export default TableFillTypeSettings;
