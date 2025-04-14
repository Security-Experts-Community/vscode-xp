import * as Mustache from 'mustache';

export class MustacheFormatter {
  constructor(private readonly _templateContent: string) {}

  public format(properties: any): string {
    const htmlContent = Mustache.render(this._templateContent, properties);
    return htmlContent;
  }
}
