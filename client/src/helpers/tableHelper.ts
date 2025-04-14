export class TableHelper {
  public static getFieldName(field: any): string {
    return Object.keys(field)[0];
  }
}
