/**
 * DateService handles local Brazilian and device timezone operations
 * preventing UTC day shifts (e.g. evening meals being logged into next day).
 */
export class DateService {
  /**
   * Returns YYYY-MM-DD in the user's local timezone (or provided date)
   */
  static getLocalDate(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Returns HH:mm in local time
   */
  static getLocalTime(date: Date = new Date()): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Returns ISO local timestamp representation without UTC shift
   */
  static getLocalDateTime(date: Date = new Date()): string {
    return `${this.getLocalDate(date)}T${this.getLocalTime(date)}:00`;
  }

  /**
   * Formats a YYYY-MM-DD date into Brazilian Portuguese display
   * e.g. "Hoje", "Ontem" or "Sex, 3 de out"
   */
  static formatLocalDate(dateStr: string): string {
    const today = this.getLocalDate();
    if (dateStr === today) return 'Hoje';

    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    if (dateStr === this.getLocalDate(yesterdayDate)) return 'Ontem';

    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return dateStr;

    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  /**
   * Returns Start of Local Day (00:00:00)
   */
  static startOfLocalDay(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  /**
   * Returns End of Local Day (23:59:59.999)
   */
  static endOfLocalDay(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 23, 59, 59, 999);
  }
}
