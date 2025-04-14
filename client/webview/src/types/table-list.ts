// The form in which the extension sends the table list data
export type TableListDto = {
  name: string;
  type: number;
  fillType: TableListFillType;
  ttl?: number;
  maxSize?: number;
  typicalSize?: number;
  userCanEditContent: boolean;
  fields: { [columnName: string]: TableColumnData }[];
  metainfo: { ruDescription: string; enDescription: string };
  defaults: { [K in DefaultsKey]: Record<string, unknown>[] };
};

export type DefaultsKey = 'PT' | 'LOC';

export type TableListFillType =
  | 'Registry'
  | 'CorrelationRule'
  | 'EnrichmentRule'
  | 'AssetGrid'
  | 'CybsiGrid';

export type TableListColumnType = 'String' | 'Number' | 'DateTime' | 'Regex';

// The form the webview stores the table list data
export type TableList = {
  name: string;
  type: number;
  fillType: TableListFillType;
  userCanEditContent?: boolean;
  ttl?: number;
  maxSize?: number;
  typicalSize?: number;
  metainfo: { ruDescription: string; enDescription: string };
  columns: TableColumn[];
  defaults: TableDefaults;
};

export type TableColumn = {
  id: string;
  name: string;
  data: TableColumnData;
};

export type TableColumnData = {
  type: TableListColumnType;
  primaryKey: boolean;
  index: boolean;
  nullable: boolean;
  unique: boolean;
};

export type TableDefaults = { [K in DefaultsKey]: Map<string, TableDefaultsRecord> };
export type TableDefaultsRecord = { id: string; values: Record<string, string> };
