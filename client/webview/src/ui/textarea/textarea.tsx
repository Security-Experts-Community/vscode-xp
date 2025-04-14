import clsx from 'clsx';
import { forwardRef, useEffect, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import Icon from '../icon/icon';
import styles from './textarea.module.scss';

interface TextareaProps {
  value: string;
  minRows?: number;
  maxRows?: number;
  placeholder?: string;
  hideNewLineIcon?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  onChange(value: string): void;
}

const Textarea = forwardRef<HTMLInputElement, TextareaProps>(
  (
    {
      value,
      minRows = 1,
      maxRows = 8,
      placeholder = '',
      hideNewLineIcon,
      isDisabled,
      isInvalid,
      onChange
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [innerValue, setInnerValue] = useState(value);

    useEffect(() => {
      setInnerValue(value);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInnerValue(e.target.value);
      onChange(e.target.value);
    };

    const handleFocus = () => {
      setIsFocused(true);
    };

    const handleBlur = () => {
      setIsFocused(false);
    };

    return (
      <div
        ref={ref}
        className={clsx(
          styles.root,
          isFocused && styles.isFocused,
          isInvalid && styles.isInvalid,
          isDisabled && styles.isDisabled
        )}
      >
        <TextareaAutosize
          title=""
          className={styles.textarea}
          disabled={isDisabled}
          value={innerValue}
          placeholder={placeholder}
          minRows={minRows}
          maxRows={maxRows}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {!hideNewLineIcon && (
          <div className={styles.newLineIcon}>
            <Icon id="newline" />
          </div>
        )}
      </div>
    );
  }
);

export default Textarea;
