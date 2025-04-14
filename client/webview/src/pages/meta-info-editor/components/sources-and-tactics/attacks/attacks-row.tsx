import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { useTranslations } from '~/hooks/use-translations';
import ActionButton from '~/ui/action-button/action-button';
import Select from '~/ui/select/select';
import Tooltip from '~/ui/tooltip/tooltip';
import { state, useActions, useEditor } from '../../../store';
import styles from './attacks-row.module.scss';
import TechniqueItem from './technique-item';

interface AttacksRowProps {
  index: number;
}

function AttacksRow({ index }: AttacksRowProps) {
  const translations = useTranslations();
  const { data, availableTactics } = useEditor();
  const { getMitreAttackData, getMitreTechniqueMetadata } = useActions();
  const [isEditing, setIsEditing] = useState(false);

  const { Tactic: tactic, Techniques: techniques } = data.attacks[index];

  const tactics = useMemo(
    () => [{ value: tactic }].concat(availableTactics.map((tactic) => ({ value: tactic }))),
    [availableTactics, tactic]
  );

  const techniquesList = useMemo(() => {
    return getMitreAttackData().techniques[tactic].map((technique) => ({
      value: technique,
      label: `${technique} - ${getMitreTechniqueMetadata(technique).name}`
    }));
  }, [tactic, getMitreAttackData, getMitreTechniqueMetadata]);

  return (
    <div key={index} data-index={index} className={styles.root}>
      <Select
        isSearchEnabled
        className={styles.select}
        items={tactics}
        selectedValue={tactic}
        onSelect={(tactic) => {
          if (tactic != state.data.attacks[index].Tactic) {
            state.data.attacks[index].Techniques = [];
          }
          state.data.attacks[index].Tactic = tactic;
        }}
      />
      <div className={styles.techniques}>
        {techniques.map((technique) => (
          <TechniqueItem key={technique} technique={technique} index={+index} />
        ))}
        {isEditing && (
          <Select
            autoFocus
            isMultiselect
            isSearchEnabled
            className={clsx(styles.select, styles.technique)}
            items={techniquesList}
            selectedValue={techniques as string[]}
            emptyListMessage={translations.NothingFound}
            onSelect={(technique) => {
              const { Techniques } = state.data.attacks[index];
              const techniqueIndex = Techniques.indexOf(technique);
              if (techniqueIndex > -1) {
                Techniques.splice(techniqueIndex, 1);
              } else {
                Techniques.push(technique);
                Techniques.sort(new Intl.Collator().compare);
              }
              setIsEditing(false);
            }}
            onBlur={() => {
              setIsEditing(false);
            }}
          />
        )}
        {!isEditing && (
          <Tooltip title={translations.AddTechnique} position="top">
            <ActionButton
              className={styles.addButton}
              iconId="add"
              onClick={() => {
                setIsEditing(true);
              }}
            />
          </Tooltip>
        )}
      </div>
      <Tooltip title={translations.Delete} position="top">
        <ActionButton
          className={styles.deleteButton}
          iconId="trash"
          onClick={() => {
            state.data.attacks.splice(index, 1);
          }}
        />
      </Tooltip>
    </div>
  );
}

export default AttacksRow;
