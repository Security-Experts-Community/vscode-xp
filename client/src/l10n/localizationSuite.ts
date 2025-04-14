import * as fs from 'fs';

export class LocalizationSuite {
  private readonly localizationMap: Map<string, string> = new Map();

  constructor(
    private readonly staticLocalizationFilePath: string,
    private readonly dynamicLocalizationFilePath: string,
    public readonly localizationTag: string,
    private readonly notLocalizedBundleFilePath?: string
  ) {
    this.assignLocalization();
  }

  public getMessage(
    messageKey: string,
    ...args: (string | number | boolean | undefined | null)[]
  ): string {
    const propertyValue = this.localizationMap.get(messageKey);
    if (!propertyValue) {
      return messageKey;
    }

    return propertyValue.toString().replace(/{(\d+)}/g, (match, number) => {
      const argVal = args[number];
      if (argVal !== undefined && argVal !== null) {
        return argVal.toString();
      }

      return match;
    });
  }

  public getLocalizationKeyByLocalizedValue(localizedValue: string): string | null {
    const localizationKeys = this.localizationMap.keys();
    for (const key of localizationKeys) {
      if (this.localizationMap.get(key) === localizedValue) {
        return key;
      }
    }
    return null;
  }

  private assignLocalization() {
    this.assignJsonFile(this.localizationMap, this.staticLocalizationFilePath);
    this.assignJsonFile(this.localizationMap, this.dynamicLocalizationFilePath);
    if (this.notLocalizedBundleFilePath) {
      this.assignJsonFile(this.localizationMap, this.notLocalizedBundleFilePath);
    }
  }

  private assignJsonFile(targetMap: Map<string, string>, pathToJsonFile: string) {
    const fileContent = JSON.parse(fs.readFileSync(pathToJsonFile, 'utf8'));
    for (const key in fileContent) {
      targetMap.set(key, fileContent[key]);
    }
  }
}
