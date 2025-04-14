import { useCallback, useState } from 'react';
import { useTranslations } from '~/hooks/use-translations';
import ActionButton from '~/ui/action-button/action-button';
import Textfield from '~/ui/textfield/textfield';
import Tooltip from '~/ui/tooltip/tooltip';
import { state } from '../../../store';
import styles from './event-input.module.scss';

interface EventInputProps {
  dataSourceIndex: number;
  setIsEditing(isEditing: boolean): void;
}

function EventInput({ dataSourceIndex, setIsEditing }: EventInputProps) {
  const translations = useTranslations();
  const [inputValue, setInputValue] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleEventAdd = () => {
    if (errorMessage) {
      return;
    }
    state.data.dataSources[dataSourceIndex].EventID.push(inputValue);
    setInputValue('');
    setErrorMessage('');
    setIsEditing(false);
  };

  const handleEventInput = (eventName: string) => {
    setInputValue(eventName);
    if (!eventName) {
      setErrorMessage(translations.EmptyEventValue);
      return;
    }
    if (eventName) {
      const isEventNameDuplicated =
        state.data.dataSources[dataSourceIndex].EventID.includes(eventName);
      if (isEventNameDuplicated) {
        setErrorMessage(translations.DuplicatedEventValue);
        return;
      }
    }
    setErrorMessage('');
  };

  const handleSelectBlur = useCallback(
    (value: string) => {
      if (!value) {
        setIsEditing(false);
      }
    },
    [setIsEditing]
  );

  return (
    <div className={styles.root}>
      <Tooltip title={errorMessage} variant="error" position="bottom">
        <Textfield
          autoFocus
          className={styles.textfield}
          value={inputValue}
          isInvalid={!!errorMessage}
          onChange={handleEventInput}
          onSubmit={handleEventAdd}
          onBlur={handleSelectBlur}
        />
      </Tooltip>
      <Tooltip title={translations.Save} position="top">
        <ActionButton
          className={styles.addIcon}
          iconId="check"
          isDisabled={!!errorMessage}
          onClick={handleEventAdd}
        />
      </Tooltip>
    </div>
  );
}

export default EventInput;
