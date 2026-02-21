export type FilterType = 'enum' | 'range' | 'daterange' | 'text' | 'none';

export interface ColumnSchema {
  name: string;
  dataType: string;
  columnType: string;
  isNullable: boolean;
  columnKey: string;
  extra: string;
  filterType: FilterType;
  enumValues?: string[];
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  fulltextColumns: string[][];
}

export interface SchemaCache {
  tables: TableSchema[];
  fetchedAt: number;
}

export interface PaginatedResult {
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ColumnFilter {
  column: string;
  type: 'exact' | 'like' | 'min' | 'max';
  value: string;
}

export interface SearchParams {
  tableName: string;
  query?: string;
  filters: ColumnFilter[];
  sort?: string;
  order?: 'asc' | 'desc';
  page: number;
  pageSize: number;
}
