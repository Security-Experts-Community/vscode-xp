// Common types used in various editors

export type PageName =
  | 'meta-info-editor'
  | 'unit-test-editor'
  | 'table-list-editor'
  | 'create-rule-editor'
  | 'localization-editor'
  | 'full-graph-run-editor'
  | 'retro-correlation-editor'
  | 'integration-test-editor';

export type Language = 'xp' | 'json' | 'json-lines' | 'xp-test-code';

export type Translations = Record<string, string>;

export type RuleType = 'correlation' | 'normalization';

export type StringArrayKeys<T> = {
  [K in keyof T]: T[K] extends string[] ? K : never;
}[keyof T];

type ErrorID = string;
type ErrorMessage = string;
export type StateErrors = Record<ErrorID, ErrorMessage>;
