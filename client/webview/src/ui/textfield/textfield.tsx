import clsx from 'clsx';
import { forwardRef, useEffect, useRef, useState } from 'react';
import styles from './textfield.module.scss';

interface TextfieldProps extends React.PropsWithChildren {
  className?: string;
  type?: 'number' | 'text';
  min?: number;
  max?: number;
  value?: string | number;
  placeholder?: string;
  autoFocus?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  onChange(value: string): void;
  onSubmit?(value: string): void;
  onBlur?(value: string): void;
}

const Textfield = forwardRef<HTMLDivElement, TextfieldProps>(
  (
    {
      className,
      type = 'text',
      min,
      max,
      value = '',
      placeholder = '',
      autoFocus,
      isDisabled = false,
      isInvalid = false,
      onChange,
      onSubmit,
      onBlur
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [innerValue, setInnerValue] = useState(value);

    useEffect(() => {
      setInnerValue(value);
    }, [value]);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = e.currentTarget;
      setInnerValue(value);
      onChange(value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (onSubmit && e.key == 'Enter') {
        onSubmit(e.currentTarget.value);
        return;
      }
    };

    const handleFocus = () => {
      setIsFocused(true);
    };

    const handleBlur = () => {
      setIsFocused(false);
      onBlur?.(String(innerValue));
    };

    useEffect(() => {
      if (autoFocus) {
        inputRef.current?.focus();
      }
    }, [autoFocus]);

    return (
      <div
        ref={ref}
        className={clsx(
          className,
          styles.root,
          isFocused && styles.isFocused,
          isInvalid && styles.isInvalid,
          isDisabled && styles.isDisabled
        )}
      >
        <input
          title=""
          ref={inputRef}
          className={styles.input}
          disabled={isDisabled}
          value={innerValue}
          placeholder={placeholder}
          type={type}
          min={min}
          max={max}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </div>
    );
  }
);

export default Textfield;
