import { useState } from 'react';
import { useTranslations } from '~/hooks/use-translations';
import { Language } from '~/types';
import Checkbox from '~/ui/checkbox/checkbox';
import CodeEditor from '~/ui/code-editor/code-editor';
import styles from './code-section.module.scss';

interface CodeSectionProps {
  title: React.ReactNode;
  code: string;
  language?: Language;
  readOnly?: boolean;
  setCode(code: string): void;
}

function CodeSection({ title, code, language, readOnly, setCode }: CodeSectionProps) {
  const translations = useTranslations();
  const [wordWrap, setWordWrap] = useState(false);

  return (
    <section className={styles.root}>
      <header className={styles.header}>
        <span>{title}</span>
        <Checkbox label={translations.WordWrap} isChecked={wordWrap} onChange={setWordWrap} />
      </header>
      <div className={styles.editor}>
        <CodeEditor
          code={code}
          language={language}
          wordWrap={wordWrap}
          readOnly={readOnly}
          setCode={setCode}
        />
      </div>
    </section>
  );
}

export default CodeSection;
