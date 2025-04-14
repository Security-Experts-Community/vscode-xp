import { DefaultsKey } from '~/types';
import { isNumberInRange } from '~/utils';
import { defaultErrors, state, translations } from './store';

export const validation = {
  registerError(
    section: keyof typeof state.errors,
    errorId: string,
    isValid: boolean,
    errorMessage: string,
    defaultsKey?: DefaultsKey
  ) {
    if (section == 'defaults') {
      if (isValid) delete state.errors[section][defaultsKey!][errorId];
      else state.errors[section][defaultsKey!][errorId] = errorMessage;
      return;
    }
    if (isValid) delete state.errors[section][errorId];
    else state.errors[section][errorId] = errorMessage;
  },

  // General Settings
  validateTableName(tableName: string) {
    this.registerError(
      'general',
      'tableName',
      /^[a-z][a-z0-9_]*$/gi.test(tableName),
      translations.IncorrectTableName
    );
  },

  validateTypicalSize(typicalSize: number) {
    this.registerError(
      'general',
      'typicalSize',
      Number.isInteger(typicalSize) && isNumberInRange(typicalSize, 0, 2 ** 31 - 1),
      translations.IncorrectTTLSize
    );
  },

  validateMaxSize(maxSize: number) {
    this.registerError(
      'general',
      'maxSize',
      Number.isInteger(maxSize) && isNumberInRange(maxSize, 0, 2 ** 31 - 1),
      translations.IncorrectTTLSize
    );
  },

  // TTL Settings
  validateTTL(ttl: number) {
    this.registerError('general', 'ttl', ttl > 0, translations.EmptyTTLValue);
  },

  validateTTLDays(days: number) {
    this.registerError(
      'general',
      'ttlDays',
      Number.isInteger(days) && isNumberInRange(days, 0, 90),
      translations.IncorrectTTLDays
    );
  },

  validateTTLHours(hours: number) {
    this.registerError(
      'general',
      'ttlHours',
      Number.isInteger(hours) && isNumberInRange(hours, 0, 23),
      translations.IncorrectTTLHours
    );
  },

  validateTTLMinutes(minutes: number) {
    this.registerError(
      'general',
      'ttlMinutes',
      Number.isInteger(minutes) && isNumberInRange(minutes, 0, 59),
      translations.IncorrectTTLMinutes
    );
  },

  resetTTLErrors() {
    ['ttl', 'maxSize', 'typicalSize', 'ttlDays', 'ttlHours', 'ttlMinutes'].forEach((key) => {
      delete state.errors.general[key];
    });
  },

  resetTTLValues() {
    state.data.ttl = 0;
    state.data.maxSize = 0;
    state.data.typicalSize = 0;
  },

  validateColumnName(columnId: string, columnName: string) {
    this.registerError(
      'columns',
      `name/invalid/${columnId}`,
      /^[a-z][a-z0-9_]*$/gi.test(columnName),
      translations.IncorrectColumnName
    );
  },

  // Column names shouldn't duplicate
  validateColumnNameDuplicates() {
    const columnNames = new Map<string, string>();

    const registerError = (columnId: string, isColumnDuplicated: boolean) => {
      this.registerError(
        'columns',
        `name/duplicated/${columnId}`,
        isColumnDuplicated,
        translations.DuplicatedColumnName
      );
    };

    for (const column of state.data.columns) {
      const isColumnDuplicated = columnNames.has(column.name);
      if (isColumnDuplicated) {
        registerError(columnNames.get(column.name)!, false);
      }
      registerError(column.id, !isColumnDuplicated);
      columnNames.set(column.name, column.id);
    }
  },

  // Should be at least one primary key column
  validatePrimaryKeysCount() {
    const hasPrimaryKeyColumn = state.data.columns.some((column) => column.data.primaryKey);
    this.registerError(
      'columns',
      `noPrimaryColumns`,
      hasPrimaryKeyColumn,
      translations.NoPrimaryKeyColumns
    );
  },

  resetColumnErrors(columnId: string) {
    delete state.errors.columns[`name/invalid/${columnId}`];
    delete state.errors.columns[`name/duplicated/${columnId}`];
  },

  validateDefaultValue(
    defaultsKey: DefaultsKey,
    recordId: string,
    columnName: string,
    value: string
  ) {
    let isValid = true;
    let errorMessage = '';

    try {
      const column = state.data.columns.find(({ name }) => name === columnName)!;
      const isColumnNullable = column.data.nullable;

      // If non-nullable column has `null` value
      if (!isColumnNullable && (value === '' || value == null)) {
        throw Error(translations.NullValueForNonNullableColumn);
      }

      if (!isColumnNullable || (value !== '' && value != null)) {
        switch (column.data.type) {
          case 'Number':
            if (!/^-?\d+(\.\d+)?$/g.test(value)) {
              throw Error(translations.IncorrectNumberFormat);
            }
            break;

          case 'DateTime':
            if (new Date(value).toString() == 'Invalid Date') {
              throw Error(translations.IncorrectDateFormat);
            }
            break;

          case 'Regex':
            try {
              new RegExp(value);
            } catch {
              throw Error(translations.IncorrectRegexFormat);
            }
            break;
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      isValid = false;
      errorMessage = error?.message;
    }

    this.registerError('defaults', `${recordId}/${columnName}`, isValid, errorMessage, defaultsKey);
  },

  validateDefaultValueDuplicates(defaultsKey: DefaultsKey) {
    const primaryKeyColumns = state.data.columns.filter(({ data }) => data.primaryKey);
    const primaryKeys = new Map<string, string>();

    const registerError = (recordId: string, isDuplicated: boolean) => {
      this.registerError(
        'defaults',
        `duplicated/${recordId}`,
        isDuplicated,
        translations.DuplicatedDefaultsPrimaryKey,
        defaultsKey
      );
    };

    for (const record of state.data.defaults[defaultsKey].values()) {
      const primaryKey = JSON.stringify(
        primaryKeyColumns.reduce<Record<string, string>>((result, column) => {
          result[column.name] = record.values[column.name];
          return result;
        }, {})
      );
      const isPrimaryKeyDuplicated = primaryKeys.has(primaryKey);
      if (isPrimaryKeyDuplicated) {
        registerError(primaryKeys.get(primaryKey)!, false);
      }
      registerError(record.id, !isPrimaryKeyDuplicated);
      primaryKeys.set(primaryKey, record.id);
    }
  },

  validateAllDefaultValues() {
    this.resetDefaultValuesErrors();
    (['PT', 'LOC'] as const).forEach((defaultsKey) => {
      validation.validateDefaultValueDuplicates(defaultsKey);
      state.data.defaults[defaultsKey].forEach((record) => {
        state.data.columns.forEach((column) => {
          validation.validateDefaultValue(
            defaultsKey,
            record.id,
            column.name,
            record.values[column.name]
          );
        });
      });
    });
  },

  // Validates all the data fields of the table list
  validateAll() {
    validation.resetAllErrors();
    validation.validateTableName(state.data.name);
    if (state.data.fillType == 'CorrelationRule' || state.data.fillType == 'EnrichmentRule') {
      validation.validateTypicalSize(state.data.typicalSize!);
      validation.validateMaxSize(state.data.maxSize!);
      validation.validateTTL(state.data.ttl!);
    }
    state.data.columns.forEach((column) => {
      validation.validateColumnName(column.id, column.name);
    });
    validation.validatePrimaryKeysCount();
    validation.validateColumnNameDuplicates();
    if (state.data.fillType == 'Registry') {
      validation.validateAllDefaultValues();
    }
  },

  resetAllErrors() {
    state.errors = structuredClone(defaultErrors);
  },

  resetDefaultValuesErrors() {
    state.errors.defaults = structuredClone(defaultErrors.defaults);
  }
};
