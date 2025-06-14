export interface ColumnConfig<T> {
  key: string;
  header: string;
  format?: (value: any, row: T) => string;
  showEditIcon?: (row: T) => boolean;
  showDeleteIcon?: (row: T) => boolean;
  showCheckbox?: (row: T) => boolean;
}
