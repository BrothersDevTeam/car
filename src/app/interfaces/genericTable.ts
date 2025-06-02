export interface ColumnConfig<T> {
  key: string;
  header: string;
  format?: (value: any, row: T) => string;
}
