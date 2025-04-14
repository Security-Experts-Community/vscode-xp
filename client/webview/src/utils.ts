// Transforms the date object into a formatted string
//
// d - day
// y - year
// m - month
// H - hour
// M - minute
// S - second
//
// Examples:
// formatDate(new Date(), 'd.m.y') // '22.12.1955'
// formatDate(new Date(), 'm-y_d H:M:S') // '12-1955_22 04:05:13'
export const formatDate = (date: Date, mask = 'y-m-d H:M:S') => {
  const map: Record<string, number> = {
    d: date.getDate(),
    m: date.getMonth() + 1,
    y: date.getFullYear(),
    H: date.getHours(),
    M: date.getMinutes(),
    S: date.getSeconds()
  };

  return mask
    .split('')
    .map((char) => (map[char] != null ? String(map[char]).padStart(2, '0') : char))
    .join('');
};

export const isObjectEmpty = (object: Record<string, unknown>) => Object.keys(object).length === 0;
export const isNumberInRange = (n: number, min: number, max: number) => n >= min && n <= max;

/* eslint-disable @typescript-eslint/no-explicit-any */
export const debounce = (fn: (...args: any[]) => any, delay: number = 100) => {
  let timeoutId: number;

  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(fn, delay, ...args);
  };
};

export function throttle(fn: (...args: any[]) => any, delay: number = 100) {
  let isThrottled = false;
  let args: any[] | null;
  let that: any | null;

  return function wrapper(this: any, ...nextArgs: any[]) {
    if (isThrottled) {
      args = nextArgs;
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      that = this;
      return;
    }

    fn.apply(this, nextArgs);
    isThrottled = true;

    setTimeout(() => {
      isThrottled = false;

      if (args) {
        wrapper.apply(that, args);
        args = that = null;
      }
    }, delay);
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
