import { useMemo } from 'react';
import CodeSpan from '~/ui/code-span/code-span';
import Tooltip from '~/ui/tooltip/tooltip';
import { state, useActions } from '../../../store';
import InteractiveItem from '../interactive-item/interactive-item';
import styles from './technique-item.module.scss';

interface TechniqueItemProps {
  technique: string;
  index: number;
}

function TechniqueItem({ technique, index }: TechniqueItemProps) {
  const { getMitreTechniqueMetadata } = useActions();
  const techniqueMetadata = getMitreTechniqueMetadata(technique);

  const description = useMemo(
    () =>
      techniqueMetadata.description
        // Remove citations
        .replace(/\(Citation: ([^\)]*)\)/g, '')
        // Replace markdown links with <a>
        .replace(
          /\[([^\]]*)\]\(([^\)]*)\)/g,
          '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>'
        )
        // Wrap code spans with <code>
        .replace(/`([^`]*)`/g, '<code>$1</code>')
        // Wrap bold text with <b>
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        // Wrap list item groups with <ul>
        .replace(/((\s*\* (.*?)(\n|$))+)/g, '<ul>$1</ul>')
        // Wrap each list item with <li>
        .replace(/\s*\* (.*?)(\n|$)/g, '<li>$1</li>')
        // Wrap text, separated with new line, with <p>
        .replace(/(.+)(\n|$)/g, '<p>$1</p>')
        // Wrap headings with <h3>
        .replace(/### (.*)(\n|$)/g, '<h3>$1</h3>'),
    [techniqueMetadata]
  );

  return (
    <Tooltip
      key={technique}
      isInteractive
      maxWidth={500}
      maxHeight={300}
      title={
        <div>
          <header className={styles.header}>
            <CodeSpan>{techniqueMetadata.id}</CodeSpan>
            {techniqueMetadata.name}
            {techniqueMetadata.deprecated && (
              <span className={styles.deprecatedMessage}>[deprecated]</span>
            )}
          </header>
          <div className={styles.content} dangerouslySetInnerHTML={{ __html: description }} />
        </div>
      }
      position="top"
    >
      <InteractiveItem
        label={technique}
        link={techniqueMetadata.url}
        isDeprecated={techniqueMetadata.deprecated}
        onRemove={() => {
          const { Techniques } = state.data.attacks[index];
          const techniqueIndex = Techniques.indexOf(technique);
          if (techniqueIndex > -1) {
            Techniques.splice(techniqueIndex, 1);
          }
        }}
      />
    </Tooltip>
  );
}

export default TechniqueItem;
