import { useMemo, useState } from 'react';
import { useTranslations } from '~/hooks/use-translations';
import ActionButton from '~/ui/action-button/action-button';
import Select from '~/ui/select/select';
import Tooltip from '~/ui/tooltip/tooltip';
import { state, useEditor } from '../../../store';
import InteractiveItem from '../interactive-item/interactive-item';
import styles from './data-sources-row.module.scss';
import EventInput from './event-input';

interface DataSourcesRowProps {
  index: number;
}

function DataSourcesRow({ index }: DataSourcesRowProps) {
  const translations = useTranslations();
  const { data, availableProviders } = useEditor();
  const [isEditing, setIsEditing] = useState(false);

  const { Provider: provider, EventID: events } = data.dataSources[index];

  const providers = useMemo(
    () => [{ value: provider }].concat(availableProviders.map((provider) => ({ value: provider }))),
    [availableProviders, provider]
  );

  return (
    <div key={index} data-index={index} className={styles.root}>
      <Select
        isSearchEnabled
        className={styles.select}
        items={providers}
        selectedValue={provider}
        onSelect={(provider) => {
          state.data.dataSources[index].Provider = provider;
        }}
      />
      <div className={styles.events}>
        {events.map((event) => (
          <InteractiveItem
            key={event}
            label={event}
            onRemove={() => {
              const { EventID } = state.data.dataSources[index];
              const eventIndex = EventID.indexOf(event);
              if (eventIndex > -1) {
                EventID.splice(eventIndex, 1);
              }
            }}
          />
        ))}
        {isEditing && <EventInput dataSourceIndex={index} setIsEditing={setIsEditing} />}
        {!isEditing && (
          <Tooltip title={translations.AddEvent} position="top">
            <ActionButton
              iconId="add"
              className={styles.addEventButton}
              onClick={() => {
                setIsEditing(true);
              }}
            />
          </Tooltip>
        )}
      </div>
      <div>
        <Tooltip title={translations.Delete} position="top">
          <ActionButton
            className={styles.deleteButton}
            iconId="trash"
            onClick={() => {
              state.data.dataSources.splice(index, 1);
            }}
          />
        </Tooltip>
      </div>
    </div>
  );
}

export default DataSourcesRow;
