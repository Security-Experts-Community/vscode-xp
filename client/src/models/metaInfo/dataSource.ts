export class DataSource {
  public constructor(provider: string, eventID: string[]) {
    this.Provider = provider;
    this.EventID = eventID;
  }

  public Provider: string;
  public EventID: string[];
}
