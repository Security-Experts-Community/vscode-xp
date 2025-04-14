export class MetaInfoEventDescription {
  private _criteria: string;
  private _localizationId: string;

  public setCriteria(criteria: string) {
    this._criteria = criteria;
  }

  public getCriteria() {
    return this._criteria;
  }

  public setLocalizationId(localizationId: string) {
    this._localizationId = localizationId;
  }

  public getLocalizationId() {
    return this._localizationId;
  }
}
