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
    // Сначала идут директории, потом отдельные item-ы.
    if (l.isFolder() !== r.isFolder()) {
      return l.isFolder() ? -1 : 1;
    }

    // Сначала идут системные пакеты, потом пользовательские.
    const lIsSystem = !!l.getMetaInfo().getObjectId()?.startsWith('PT');
    const rIsSystem = !!r.getMetaInfo().getObjectId()?.startsWith('PT');
    if (lIsSystem !== rIsSystem) {
      return lIsSystem ? -1 : 1;
    }

    return l.getName().localeCompare(r.getName());
  }
}
