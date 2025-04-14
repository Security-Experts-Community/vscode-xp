import { usePostMessage } from '~/hooks/use-post-message';
import { useTranslations } from '~/hooks/use-translations';
import ActionButton from '~/ui/action-button/action-button';
import CodeSpan from '~/ui/code-span/code-span';
import Label from '~/ui/label/label';
import SettingBox from '~/ui/setting-box/setting-box';
import Subheader from '~/ui/subheader/subheader';
import Tooltip from '~/ui/tooltip/tooltip';
import { useEditor } from '../../store';
import styles from './dependencies.module.scss';

function Dependencies() {
  const translations = useTranslations();
  const postMessage = usePostMessage();
  const { data } = useEditor();

  return (
    <div className={styles.root}>
      <div className={styles.content}>
        <Subheader>{translations.DependenciesTab}</Subheader>
        {!data.dependencies && (
          <div className={styles.noDependenciesMessage}>{translations.NoDependencies}</div>
        )}
        {data.dependencies &&
          Object.entries(data.dependencies).map(([section, dependencies]) => (
            <SettingBox key={section} className={styles.section}>
              <Label>{section}</Label>
              <div>
                {Object.entries(dependencies).map(([objectId, dependencyName]) => (
                  <div key={objectId} className={styles.dependency}>
                    <CodeSpan>{objectId}</CodeSpan>
                    <div className={styles.dependencyContent}>
                      <span>{dependencyName}</span>
                      <a href="#" className={styles.dependencyLink}>
                        <Tooltip title={translations.GoToFile} position="top">
                          <ActionButton
                            className={styles.dependencyGoToFileButton}
                            iconId="go-to-file"
                            onClick={() => {
                              postMessage({
                                command: 'MetaInfoEditor.openFileByObjectId',
                                payload: { objectId }
                              });
                            }}
                          />
                        </Tooltip>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </SettingBox>
          ))}
      </div>
    </div>
  );
}

export default Dependencies;
