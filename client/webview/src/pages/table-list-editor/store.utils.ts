import { proxyMap } from 'valtio/utils';
import { TableDefaultsRecord, TableList, TableListDto } from '~/types';
import { state } from './store';

/**
 * This file contains utility functions for transforming the data for convenient
 * use on the client, and vice versa
 */

// Converts initial data into a more suitable format to work with on the client
export const preprocessData = (data: TableListDto) => {
  return {
    ...data,
    columns: data.fields.map((field) => {
      const [[columnName, columnData]] = Object.entries(field);
      return {
        id: window.crypto.randomUUID(),
        name: columnName,
        data: { ...columnData }
      };
    }),
    defaults: {
      PT: data.defaults.PT.reduce((result, values) => {
        const recordId = window.crypto.randomUUID();
        result.set(recordId, { id: recordId, values: preprocessDefaultValues(values) });
        return result;
      }, proxyMap<string, TableDefaultsRecord>()),
      LOC: data.defaults.LOC.reduce((result, values) => {
        const recordId = window.crypto.randomUUID();
        result.set(recordId, { id: recordId, values: preprocessDefaultValues(values) });
        return result;
      }, proxyMap<string, TableDefaultsRecord>())
    }
  };
};

// Replace `null` with empty string and stringify all values
export const preprocessDefaultValues = (values: Record<string, unknown>) => {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(values)) {
    result[key] = value == null ? '' : String(value);
  }

  return result;
};

// Converts the data to initial format
export const postprocessData = (data: TableList) => {
  const result = {
    name: data.name,
    type: data.type,
    fillType: data.fillType,
    metainfo: { ...data.metainfo },
    fields: data.columns.map((column) => ({ [column.name]: { ...column.data } }))
  } as TableListDto;

  switch (data.fillType) {
    case 'Registry':
      result.userCanEditContent = true;
      result.defaults = {
        PT: Array.from(data.defaults.PT.values()).map(postprocessDefaultValues),
        LOC: Array.from(data.defaults.LOC.values()).map(postprocessDefaultValues)
      };
      break;

    case 'CorrelationRule':
    case 'EnrichmentRule':
      Object.assign(result, {
        ttl: data.ttl,
        maxSize: data.maxSize,
        typicalSize: data.typicalSize
      });
      break;
  }

  return result;
};

// Replace empty string with `null`, convert Number column values to number type
// Save only the values of existing columns
export const postprocessDefaultValues = (record: TableDefaultsRecord) => {
  const result: Record<string, unknown> = {};

  // Extract only the values of existing columns
  state.data.columns.forEach((column) => {
    const value = record.values[column.name];
    if (value === '' || value == null) {
      result[column.name] = null;
    } else {
      const { data } = column;
      result[column.name] = data.type == 'Number' ? Number(value) : value;
    }
  });

  return result;
};
