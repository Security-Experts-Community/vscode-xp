export class JsHelper {
  public static wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  public static isEmptyObj(obj: any): boolean {
    return Object.keys(obj).length === 0;
  }

  /**
   * Возвращает первый дублирующий элемент или null
   */
  public static findDuplicates(arr: string[]): string | null {
    const sortedArr = arr.slice().sort();
    for (let i = 0; i < sortedArr.length - 1; i++) {
      if (sortedArr[i + 1] == sortedArr[i]) {
        return sortedArr[i];
      }
    }
    return null;
  }

  public static removeEmptyKeys(obj: any): any {
    for (const key in obj) {
      if (!obj[key]) {
        delete obj[key];
      }
    }

    return obj;
  }

  public static formatJsonObject(object: any): string {
    return JSON.stringify(object, null, 4);
  }

  public static sortObjectKeys(object: any): any {
    if (typeof object != 'object') {
      return object;
    }
    if (object instanceof Array) {
      return object.map((obj) => {
        return this.sortObjectKeys(obj);
      });
    }
    const keys = Object.keys(object);
    if (!keys) {
      return object;
    }
    return keys.sort().reduce((obj, key) => {
      if (object[key] instanceof Array) {
        obj[key] = this.sortObjectKeys(object[key]);
      } else {
        obj[key] = object[key];
      }
      return obj;
    }, {});
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static sortEventKeys<T extends Record<string, any>>(
    object: T,
    priorityFields: string[]
  ): T {
    const keys = Object.keys(object);
    const priorityKeys = priorityFields.filter(k => keys.includes(k));
    const remainingKeys = keys.filter(k => !priorityFields.includes(k)).sort();
    return [...priorityKeys, ...remainingKeys].reduce((obj: any, key) => {
      obj[key] = object[key];
      return obj;
    }, {}) as T;
  }

  /**
   * Возвращает глубокую копию объекта с отсортированными в соотсветствии со
   * схемой полями на корневом уровне вложенности
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static sortRootKeysAccordingToSchema<T extends Record<string, any>>(
    object: T,
    schema: string[]
  ): T {
    const shallowCopiedObject = { ...object };
    const sortedObject = Object.assign(
      schema.reduce((result, field) => {
        if (Object.prototype.hasOwnProperty.call(shallowCopiedObject, field)) {
          result[field] = shallowCopiedObject[field];
          delete shallowCopiedObject[field];
        }
        return result;
      }, {}),
      shallowCopiedObject
    );

    return structuredClone(sortedObject);
  }

  /**
   * Сравнивает значения по содержимому без учета порядка ключей объектов. Пустые значения (null, пустые
   * строки, массивы и объекты) приравниваются к отсутствующему ключу.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static isEqualIgnoringEmptyValues(first: any, second: any): boolean {
    const firstIsEmpty = JsHelper.isEmptyValue(first);
    const secondIsEmpty = JsHelper.isEmptyValue(second);
    if (firstIsEmpty || secondIsEmpty) {
      return firstIsEmpty && secondIsEmpty;
    }

    if (first instanceof Date || second instanceof Date) {
      return (
        first instanceof Date && second instanceof Date && first.getTime() === second.getTime()
      );
    }

    if (Array.isArray(first) || Array.isArray(second)) {
      return (
        Array.isArray(first) &&
        Array.isArray(second) &&
        first.length === second.length &&
        first.every((item, index) => JsHelper.isEqualIgnoringEmptyValues(item, second[index]))
      );
    }

    if (typeof first === 'object' && typeof second === 'object') {
      const keys = new Set([...Object.keys(first), ...Object.keys(second)]);
      return [...keys].every((key) => JsHelper.isEqualIgnoringEmptyValues(first[key], second[key]));
    }

    return first === second;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static isEmptyValue(value: any): boolean {
    if (value === undefined || value === null || value === '') {
      return true;
    }

    if (Array.isArray(value)) {
      return value.length === 0;
    }

    if (typeof value === 'object' && !(value instanceof Date)) {
      return Object.keys(value).length === 0;
    }

    return false;
  }
}
