import * as crc32 from 'crc-32';
import * as os from 'os';

export class KbHelper {
  /**
   * Заменяет новые строки Windows формата на Linux (\r\n -> \n)
   * @param text входная строка
   * @returns результирующая строка
   */
  public static convertWindowsEOFToLinux(text: string): string {
    if (!text) {
      return '';
    }
    return text.replace(/(\r\n)/gm, '\n');
  }

  public static convertEOLToCurrOs(text: string): string {
    if (!text) {
      return '';
    }
    return text.replace(/(\r\n|\n)/gm, os.EOL);
  }

  public static getContentSubDirectories(): string[] {
    return [
      'correlation_rules',
      'tabular_lists',
      'aggregation_rules',
      'enrichment_rules',
      'normalization_formulas'
    ];
  }

  public static generateObjectId(
    ruleName: string,
    contentPrefix: string,
    objectType: string
  ): string {
    let objectId = Math.abs(crc32.str(ruleName)).toString();
    objectId = objectId.substring(0, 9);
    return `${contentPrefix}-${objectType}-${objectId}`;
  }
}
