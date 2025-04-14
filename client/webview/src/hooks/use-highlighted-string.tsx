import { useMemo } from 'react';
import styles from './use-highlighted-string.module.scss';

// Replaces the searchString matches in originString with the highlighted <span>
// JSX elements
export const useHighlightedString = (
  originString: string,
  searchString?: string,
  isDisabled = false
) => {
  return useMemo(() => {
    if (!searchString || isDisabled) {
      return originString;
    }

    // Search string regex with escaped special characters
    const searchRegex = new RegExp(
      `(${searchString.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1')})`,
      'gi'
    );

    return originString.split(searchRegex).map((substring, i) =>
      substring.toLowerCase() == searchString ? (
        <span key={i} className={styles.highlighted}>
          {substring}
        </span>
      ) : (
        substring
      )
    );
  }, [originString, searchString, isDisabled]);
};
