import { proxy, useSnapshot } from 'valtio';
import {
  StateErrors,
  type DefaultsKey,
  type TableColumn,
  type TableColumnData,
  type TableDefaultsRecord,
  type TableList,
  type TableListColumnType,
  type TableListDto,
  type TableListFillType
} from '~/types';
import { isObjectEmpty } from '~/utils';
import { postprocessData, preprocessData } from './store.utils';
import { validation } from './store.validation';

const DEFAULT_COLUMN_NAME = '';
const DEFAULT_STRING_VALUE = '';
const DEFAULT_NUMBER_VALUE = '0';
const DEFAULT_DATE_VALUE = new Date().toISOString().slice(0, 10);
const DEFAULT_REGEX_VALUE = '.*';
const SECONDS_IN_MINUTE = 60;
const SECONDS_IN_HOUR = SECONDS_IN_MINUTE * 60;
const SECONDS_IN_DAY = SECONDS_IN_HOUR * 24;

type State = {
  data: TableList;
  searchString: string;
  errors: {
    general: StateErrors;
    columns: StateErrors;
    defaults: {
      PT: StateErrors;
      LOC: StateErrors;
    };
  };
  isGeneralEditorValid: boolean;
  isColumnsEditorValid: boolean;
  isDefaultsEditorValid: boolean;
  isDefaultsPtEditorValid: boolean;
  isDefaultsLocEditorValid: boolean;
  isEditorValid: boolean;
};

export const { translations } = window.__webview;

export const defaultErrors = {
  // Errors in the general settings
  general: {},
  // Errors in the columns table
  columns: {},
  // Errors in the defaults editor
  defaults: {
    PT: {},
    LOC: {}
  }
};

export const state = proxy<State>({
  data: {} as TableList,
  searchString: '',
  errors: structuredClone(defaultErrors),
  get isGeneralEditorValid(): boolean {
    return isObjectEmpty(state.errors.general);
  },
  get isColumnsEditorValid(): boolean {
    return isObjectEmpty(state.errors.columns);
  },
  get isDefaultsEditorValid(): boolean {
    return state.isDefaultsPtEditorValid && state.isDefaultsLocEditorValid;
  },
  get isDefaultsPtEditorValid(): boolean {
    return isObjectEmpty(state.errors.defaults.PT);
  },
  get isDefaultsLocEditorValid(): boolean {
    return isObjectEmpty(state.errors.defaults.LOC);
  },
  get isEditorValid(): boolean {
    return state.isGeneralEditorValid && state.isColumnsEditorValid && state.isDefaultsEditorValid;
  }
});

const actions = {
  setName(name: string) {
    state.data.name = name;
    validation.validateTableName(name);
  },

  setDescription(language: 'ru' | 'en', description: string) {
    state.data.metainfo[`${language}Description`] = description;
  },

  setFillType(fillType: TableListFillType) {
    if (fillType == 'Registry') {
      validation.validateAllDefaultValues();
    } else {
      validation.resetDefaultValuesErrors();
    }
    if (state.data.fillType != 'CorrelationRule' && state.data.fillType != 'EnrichmentRule') {
      validation.resetTTLValues();
    }
    if (fillType != 'CorrelationRule' && fillType != 'EnrichmentRule') {
      validation.resetTTLValues();
      validation.resetTTLErrors();
    }
    state.data.fillType = fillType;
  },

  setTypicalSize(typicalSize: number) {
    state.data.typicalSize = typicalSize;
    validation.validateTypicalSize(typicalSize);
  },

  setMaxSize(maxSize: number) {
    state.data.maxSize = maxSize;
    validation.validateMaxSize(maxSize);
  },

  toggleTTLUse(isTTLUsed: boolean) {
    actions.setTTL(0, 0, 0);
    if (!isTTLUsed) {
      validation.resetTTLErrors();
    }
  },

  setTTL(days: number, hours: number, minutes: number) {
    validation.validateTTLDays(days);
    validation.validateTTLHours(hours);
    validation.validateTTLMinutes(minutes);
    const { ttlDays, ttlHours, ttlMinutes } = state.errors.general;
    if (!ttlDays && !ttlHours && !ttlMinutes) {
      const ttl = days * SECONDS_IN_DAY + hours * SECONDS_IN_HOUR + minutes * SECONDS_IN_MINUTE;
      state.data.ttl = ttl;
      validation.validateTTL(ttl);
    }
  },

  parseTTL(ttl: number) {
    const days = Math.floor((ttl || 0) / SECONDS_IN_DAY);
    const hours = Math.floor(((ttl || 0) % SECONDS_IN_DAY) / SECONDS_IN_HOUR);
    const minutes = Math.floor(((ttl || 0) % SECONDS_IN_HOUR) / SECONDS_IN_MINUTE);
    return [days, hours, minutes];
  },

  setTTLDays(days: number) {
    validation.validateTTLDays(days);
  },

  setTTLHours(hours: number) {
    validation.validateTTLHours(hours);
  },

  setTTLMinutes(minutes: number) {
    validation.validateTTLMinutes(minutes);
  },

  addColumn() {
    const column = generateColumn();
    state.data.columns.push(column);
    validation.validateColumnName(column.id, column.name);
  },

  updateColumn(columnId: string, columnName: string, columnData?: Partial<TableColumnData>) {
    const column = actions.getColumnById(columnId);
    const isColumnNameUpdated = columnName != column.name;
    if (isColumnNameUpdated) {
      validation.resetColumnErrors(columnId);
    }
    column.name = columnName;
    if (isColumnNameUpdated) {
      validation.validateColumnName(column.id, columnName);
      validation.validateColumnNameDuplicates();
    }
    if (columnData) {
      Object.assign(column.data, columnData);
    }
    validation.validatePrimaryKeysCount();
    // If a column has primary key, it should also be indexed and non-nullable
    if (column.data.primaryKey) {
      column.data.index = true;
      column.data.nullable = false;
    }
    if (state.data.fillType == 'Registry') {
      validation.validateAllDefaultValues();
    }
  },

  deleteColumn(columnId: string) {
    state.data.columns = state.data.columns.filter(({ id }) => id != columnId);
    validation.resetColumnErrors(columnId);
    validation.validateColumnNameDuplicates();
    validation.validatePrimaryKeysCount();
    if (state.data.fillType == 'Registry') {
      validation.validateAllDefaultValues();
    }
  },

  moveColumn(fromId: string, toId: string) {
    const fromIndex = state.data.columns.findIndex(({ id }) => id == fromId);
    const toIndex = state.data.columns.findIndex(({ id }) => id == toId);
    state.data.columns.splice(toIndex, 0, ...state.data.columns.splice(fromIndex, 1));
  },

  getColumnById: (columnId: string) => state.data.columns.find(({ id }) => id === columnId)!,

  addDefaultValue(key: DefaultsKey) {
    const record = generateDefaultsRecord();
    state.data.defaults[key].set(record.id, record);
    validation.validateDefaultValueDuplicates(key);
  },

  updateDefaultValue(key: DefaultsKey, recordId: string, columnName: string, value: string) {
    state.data.defaults[key].get(recordId)!.values[columnName] = value;
    validation.validateDefaultValue(key, recordId, columnName, value);
    validation.validateDefaultValueDuplicates(key);
  },

  deleteDefaultValue(key: DefaultsKey, recordId: string) {
    state.data.defaults[key].delete(recordId);
    // Remove errors in that row
    delete state.errors.defaults[key][`duplicated/${recordId}`];
    state.data.columns.forEach((column) => {
      delete state.errors.defaults[key][`${recordId}/${column.name}`];
    });
    validation.validateDefaultValueDuplicates(key);
  },

  getFilteredDefaultValueIds(defaults: Map<string, TableDefaultsRecord>): string[] {
    if (!state.searchString) {
      return Array.from(defaults.keys());
    }

    const result = [];
    const searchRegex = new RegExp(
      state.searchString.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1'),
      'i'
    );

    rowsIterator: for (const record of defaults.values()) {
      for (const value of Object.values(record.values)) {
        if (searchRegex.test(String(value))) {
          result.push(record.id);
          continue rowsIterator;
        }
      }
    }

    return result;
  },

  setSearchString(searchString: string) {
    state.searchString = searchString.toLowerCase();
  },

  setData(data: TableListDto) {
    Object.assign(state.data, preprocessData(data));
    validation.validateAll();
  },

  getData(): TableListDto {
    return postprocessData(state.data);
  }
};

const generateColumn = (): TableColumn => ({
  id: window.crypto.randomUUID(),
  name: DEFAULT_COLUMN_NAME,
  data: {
    type: 'String',
    index: false,
    nullable: false,
    primaryKey: false,
    unique: false
  }
});

const generateDefaultsRecord = (): TableDefaultsRecord => ({
  id: window.crypto.randomUUID(),
  values: state.data.columns.reduce<Record<string, string>>(
    (record, { name: columnName, data: { type: columnType } }) => {
      record[columnName] = getDefaultValueByType(columnType);
      return record;
    },
    {}
  )
});

const getDefaultValueByType = (columnType: TableListColumnType) => {
  switch (columnType) {
    case 'String':
      return DEFAULT_STRING_VALUE;
    case 'Number':
      return DEFAULT_NUMBER_VALUE;
    case 'DateTime':
      return DEFAULT_DATE_VALUE;
    case 'Regex':
      return DEFAULT_REGEX_VALUE;
  }
};

export const useEditor = () => useSnapshot(state);
export const useActions = () => actions;
