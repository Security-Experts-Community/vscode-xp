import clsx from 'clsx';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useHighlightedString } from '~/hooks/use-highlighted-string';
import styles from './editable.module.scss';

interface EditableProps {
  className?: string;
  value: string;
  searchString?: string;
  isInvalid?: boolean;
  onChange(value: string): void;
}

const Editable = forwardRef<HTMLDivElement, EditableProps>(
  ({ className, value, searchString, isInvalid = false, onChange }, ref) => {
    const editableRef = useRef<HTMLDivElement>(null);
    const caretPositionRef = useRef(0);
    const [innerValue, setInnerValue] = useState(String(value));
    const [isEditing, setIsEditing] = useState(false);

    useImperativeHandle(ref, () => editableRef.current!, []);

    useEffect(() => {
      if (!editableRef.current || !isEditing) {
        return;
      }
      if (caretPositionRef.current) {
        setCaretPosition(editableRef.current, caretPositionRef.current + 1);
        caretPositionRef.current = 0;
      } else {
        setCaretPosition(editableRef.current);
      }
    }, [innerValue, isEditing]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key == ' ') {
        caretPositionRef.current = getCaretPosition(e.currentTarget);
      }
      if (e.key == 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    };

    const handleInput = (e: React.ChangeEvent<HTMLDivElement>) => {
      if (!editableRef.current) {
        return;
      }
      const startOffset = getCaretPosition(editableRef.current);
      editableRef.current.dataset.caretPosition = String(startOffset);
      const value = (e.currentTarget.textContent || '').replace(/\n/g, '');
      setInnerValue(value);
      onChange(value);
    };

    const handleFocus = () => {
      setIsEditing(true);
    };

    const handleBlur = () => {
      setIsEditing(false);
    };

    return (
      <div
        ref={editableRef}
        className={clsx(
          styles.root,
          className,
          isEditing && styles.isEditing,
          isInvalid && styles.isInvalid
        )}
        contentEditable={isEditing ? 'plaintext-only' : 'false'}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        suppressContentEditableWarning
      >
        {useHighlightedString(innerValue, searchString, isEditing)}
      </div>
    );
  }
);

function getCaretPosition(editableNode: HTMLDivElement) {
  const selection = window.getSelection();
  if (selection && editableNode.contains(selection.anchorNode)) {
    return Math.min(selection.anchorOffset, selection.focusOffset) || 0;
  }
  return 0;
}

function setCaretPosition(editableNode: HTMLDivElement, position?: number) {
  const caretPosition = position ?? (Number(editableNode.dataset.caretPosition) || 0);
  const range = document.createRange();
  const selection = window.getSelection();
  if (selection) {
    range.setStart(
      editableNode.firstChild || editableNode,
      Math.min(caretPosition, editableNode.textContent?.length || 0)
    );
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
}

export default Editable;
