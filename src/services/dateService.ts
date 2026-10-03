import { BRAZILIAN_TIMEZONE } from '../config/constants';

/**
 * DateService strictly operates in America/Sao_Paulo timezone,
 * preventing UTC day shifts (e.g. evening meals at 22h being logged into the next day).
 * Works identically in Node.js server environments and client browsers.
 */
export class DateService {
  private static readonly TIMEZONE = BRAZILIAN_TIMEZONE || 'America/Sao_Paulo';

  /**
   * Returns YYYY-MM-DD in America/Sao_Paulo timezone
   */
  static getLocalDate(date: Date = new Date()): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  }

  /**
   * Returns HH:mm in America/Sao_Paulo timezone
   */
  static getLocalTime(date: Date = new Date()): string {
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: this.TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return formatter.format(date);
  }

  /**
   * Returns ISO local timestamp representation (YYYY-MM-DDTHH:mm:ss) in America/Sao_Paulo
   */
  static getLocalDateTime(date: Date = new Date()): string {
    const datePart = this.getLocalDate(date);
    const timePart = this.getLocalTime(date);
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${datePart}T${timePart}:${seconds}`;
  }

  /**
   * Checks if a given YYYY-MM-DD string is today in America/Sao_Paulo
   */
  static isToday(dateStr: string): boolean {
    return dateStr === this.getLocalDate();
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

    // Use noon to avoid any boundary issues
    const d = new Date(year, month - 1, day, 12, 0, 0);
    return d.toLocaleDateString('pt-BR', {
      timeZone: this.TIMEZONE,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  /**
   * Returns Start of Local Day (00:00:00) in America/Sao_Paulo
   */
  static startOfLocalDay(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 3, 0, 0)); // UTC-3 midnight
  }

  /**
   * Returns End of Local Day (23:59:59.999) in America/Sao_Paulo
   */
  static endOfLocalDay(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day + 1, 2, 59, 59, 999));
  }
}
