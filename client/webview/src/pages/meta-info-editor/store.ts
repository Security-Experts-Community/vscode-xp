import { proxy, snapshot, useSnapshot } from 'valtio';
import {
  MetaInfo,
  MetaInfoAttack,
  MetaInfoAttackData,
  MetaInfoDataSource,
  MetaInfoDto,
  StateErrors,
  StringArrayKeys
} from '~/types';
import { formatDate, isObjectEmpty } from '~/utils';
import { validation } from './store.validation';

let MITRE_ATTACK_DATA: MetaInfoAttackData;

const DEFAULT_FIELD_VALUE = '';
const DATA_SOURCE_PROVIDERS = [
  'Microsoft-Windows-Security-Auditing',
  'Microsoft-Windows-System',
  'Microsoft-Windows-Application',
  'Microsoft-Windows-Sysmon',
  'Microsoft-Windows-PowerShell',
  'Microsoft-Windows-IIS',
  'Microsoft-Windows-Bits-Client',
  'Microsoft-Windows-ActiveDirectory_DomainService',
  'Microsoft-Windows-Directory-Services-SAM',
  'Microsoft-Windows-TerminalServices-RemoteConnectionManager',
  'Microsoft-Windows-DNS-Server-Service',
  'Microsoft-Windows-CAPI2',
  'Microsoft-Windows-TaskScheduler',
  'MSExchange CmdletLogs',
  'NETLOGON',
  'User32',
  'PostgreSQL',
  'MySQL',
  'Oracle',
  'MSSQL',
  'Unix',
  'auditd',
  'syslog',
  'MacOS'
];

export type State = {
  data: MetaInfo;
  availableProviders: string[];
  availableTactics: string[];
  author: string;
  errors: {
    general: StateErrors;
  };
  isMitreAttackDataLoaded: boolean;
  isGeneralEditorValid: boolean;
  isEditorValid: boolean;
};

export const { translations } = window.__webview;

export const defaultErrors = {
  // Errors in the general settings
  general: {}
};

export const state = proxy<State>({
  data: {} as MetaInfo,
  author: '',
  errors: structuredClone(defaultErrors),
  isMitreAttackDataLoaded: false,
  get availableProviders(): string[] {
    return DATA_SOURCE_PROVIDERS.filter(
      (provider) => !state.data.dataSources.some(({ Provider }) => Provider === provider)
    );
  },
  get availableTactics(): string[] {
    return state.isMitreAttackDataLoaded
      ? actions
          .getMitreAttackData()
          .phases.filter((tactic) => !state.data.attacks.some(({ Tactic }) => Tactic === tactic))
      : [];
  },
  get isGeneralEditorValid(): boolean {
    return isObjectEmpty(state.errors.general);
  },
  get isEditorValid(): boolean {
    return state.isGeneralEditorValid;
  }
});

export const actions = {
  addFieldValue(dataField: StringArrayKeys<MetaInfo>) {
    const value = DEFAULT_FIELD_VALUE;
    const valueIndex = state.data[dataField].push(value) - 1;
    validation.validateRequiredField(`${dataField}/${valueIndex}`, value);
  },

  updateFieldValue(dataField: StringArrayKeys<MetaInfo>, valueIndex: number, value: string) {
    state.data[dataField][valueIndex] = value;
    validation.validateRequiredField(`${dataField}/${valueIndex}`, value);
  },

  deleteFieldValue(dataField: StringArrayKeys<MetaInfo>, valueIndex: number) {
    state.data[dataField].splice(valueIndex, 1);
    validation.validateDataFieldErrors(dataField);
  },

  setAuthor(author: string) {
    state.author = author;
  },

  setData(data: MetaInfoDto) {
    state.data.name = data.Name;
    state.data.createdAt = formatDate(new Date(data.Created), 'd.m.y');
    state.data.updatedAt = formatDate(new Date(data.Updated), 'd.m.y');
    state.data.objectId = data.ObjectId;
    state.data.usecases = data.Usecases || [];
    state.data.knowledgeHolders = data.KnowledgeHolders || [];
    state.data.falsepositives = data.Falsepositives || [];
    state.data.improvements = data.Improvements || [];
    state.data.references = data.References || [];
    state.data.dataSources = data.DataSources.map(({ Provider, EventID }) => ({
      Provider,
      EventID: EventID.map(String)
    }));
    state.data.attacks = data.ATTACK;
    state.data.dependencies = data.dependencies!;
    validation.validateAll();
  },

  getData(): MetaInfoDto {
    const data = snapshot(state.data);
    return {
      Name: data.name,
      Created: data.createdAt,
      Updated: data.updatedAt,
      ObjectId: data.objectId,
      Usecases: [...data.usecases],
      KnowledgeHolders: [...data.knowledgeHolders],
      Falsepositives: [...data.falsepositives],
      Improvements: [...data.improvements],
      References: [...data.references],
      DataSources: [...data.dataSources] as MetaInfoDataSource[],
      ATTACK: [...data.attacks] as MetaInfoAttack[]
    };
  },

  // If default author is set and there's no such knowledge holder currently,
  // add the author to the knowloedgeHolders list
  updateAuthors() {
    if (state.author && !state.data.knowledgeHolders.includes(state.author)) {
      state.data.knowledgeHolders.push(state.author);
    }
  },

  refreshUpdateDate() {
    state.data.updatedAt = formatDate(new Date(), 'd.m.y');
  },

  fetchMitreAttackData() {
    return fetch(`${window.__webview.extensionRootUri}/mitre_attack/data/parsed/attack.json`)
      .then((result) => result.json())
      .then((data) => {
        // We don't want the data to be proxied, so we do not include it into the state object
        // and instead store in the global variable
        MITRE_ATTACK_DATA = data;
        state.isMitreAttackDataLoaded = true;
        return true;
      });
  },

  getMitreAttackData() {
    return MITRE_ATTACK_DATA;
  },

  getMitreTechniqueMetadata(technique: string) {
    return MITRE_ATTACK_DATA.techniquesMetadata[technique];
  }
};

export const useActions = () => actions;
export const useEditor = () => useSnapshot(state);
