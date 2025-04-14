import moment from 'moment';

export class DateHelper {
  public static dateToString(date: Date): string {
    const dayNumber = date.getDate();
    const dayString = String(dayNumber).padStart(2, '0');

    const monthNumber = date.getMonth() + 1;
    const monthString = String(monthNumber).padStart(2, '0');
    return `${dayString}.${monthString}.${date.getFullYear()}`;
  }

  public static parseDate(dateString: string): Date {
    if (!dateString || dateString.length == 0) {
      throw new Error('Передана пустая строка, которая не может быть разобрана');
    }

    const pattern = /(\d{2})\.(\d{2})\.(\d{4})/;
    const dateFormat = dateString.replace(pattern, '$3-$2-$1');
    return new Date(dateFormat);
  }

  public static formatDuration(start: moment.Moment, end: moment.Moment): string {
    const ms = end.diff(start);
    const durationFormat = moment.utc(ms).format('HH:mm:ss');
    return durationFormat;
  }
}
