import { useTranslations } from '~/hooks/use-translations';
import Icon from '~/ui/icon/icon';
import { useActions, useEditor } from '../../store';
import CodeSection from '../code-section/code-section';

function RuleEditor() {
  const translations = useTranslations();
  const { setRuleData } = useActions();
  const { ruleData } = useEditor();

  return (
    <CodeSection
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Icon id="file" size={12} />
          <span style={{ margin: '0 0 1px 4px' }}>{translations.RuleCode}</span>
        </div>
      }
      language="xp"
      code={ruleData}
      setCode={setRuleData}
    />
  );
}

export default RuleEditor;
