import { ContentTreeBaseItem } from '../models/content/contentTreeBaseItem';

export class SortHelper {
  /**
   * Сортируем контент так, чтобы в начале была коробочная экспертиза, а потом пользовательская.
   * Сначала директории, потом файлы.
   * @param l
   * @param r
   * @returns
   */
  public static contentItemComparer(l: ContentTreeBaseItem, r: ContentTreeBaseItem): number {
    // Сначала идут потом отдельные item-ы.
    if (l.isFolder() && !r.isFolder()) {
      return -1;
    }

    // Сначала идут системные пакеты, потом пользовательские.
    const lObjectId = l.getMetaInfo().getObjectId();
    const rObjectId = r.getMetaInfo().getObjectId();
    if (
      lObjectId &&
      lObjectId.startsWith('PT') &&
      // Либо это обычная директория, либо пользовательский пакет
      (!rObjectId || !rObjectId.startsWith('PT'))
    ) {
      return -1;
    }

    return l.getName().localeCompare(r.getName());
  }
}
