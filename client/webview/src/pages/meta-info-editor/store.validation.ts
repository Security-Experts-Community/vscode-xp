import { MetaInfo, StringArrayKeys } from '~/types';
import { defaultErrors, state, translations } from './store';

export const validation = {
  registerError(
    section: keyof typeof state.errors,
    errorId: string,
    isValid: boolean,
    errorMessage: string
  ) {
    if (isValid) delete state.errors[section][errorId];
    else state.errors[section][errorId] = errorMessage;
  },

  // General Settings
  validateDataFieldErrors(dataField: StringArrayKeys<MetaInfo>) {
    this.resetDataFieldErrors(dataField);
    state.data[dataField].forEach((value, i) => {
      this.validateRequiredField(`${dataField}/${i}`, value);
    });
  },

  validateRequiredField(errorId: string, value: string) {
    this.registerError('general', `${errorId}/required`, value !== '', translations.EmptyValue);
  },

  validateAll() {
    validation.resetAllErrors();
    const dataFields: StringArrayKeys<MetaInfo>[] = [
      'falsepositives',
      'improvements',
      'knowledgeHolders',
      'references',
      'usecases'
    ];
    dataFields.forEach((dataField) => {
      validation.validateDataFieldErrors(dataField);
    });
  },

  resetDataFieldErrors(dataField: string) {
    for (const errorId in state.errors.general) {
      if (errorId.startsWith(dataField)) {
        delete state.errors.general[errorId];
      }
    }
  },

  resetAllErrors() {
    state.errors = structuredClone(defaultErrors);
  }
};
