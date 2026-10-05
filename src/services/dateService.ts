import { BRAZILIAN_TIMEZONE } from '../config/constants';

/**
 * DateService strictly operates in the device's timezone (defaulting to America/Sao_Paulo),
 * NEVER defaulting to UTC.
 * Prevents UTC day shifts (e.g. evening meals at 22h being logged into the next calendar day).
 * Works identically in Node.js server environments and client browsers.
 */
export class DateService {
  private static testTimezoneOverride: string | null = null;

  /**
   * For automated testing: allows mocking or overriding active timezone
   */
  static setTimezoneForTesting(tz: string | null): void {
    this.testTimezoneOverride = tz;
  }

  /**
   * Resolves the device's local timezone (e.g. from Intl API).
   * If the device reports UTC or timezone is unavailable, strictly defaults to America/Sao_Paulo.
   */
  static getEffectiveTimezone(): string {
    if (this.testTimezoneOverride) {
      return this.testTimezoneOverride;
    }

    try {
      if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
        const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (deviceTz && deviceTz !== 'UTC' && deviceTz.trim().length > 0) {
          return deviceTz;
        }
      }
    } catch {
      // Fallback to Brazilian default
    }

    return BRAZILIAN_TIMEZONE || 'America/Sao_Paulo';
  }

  /**
   * Returns YYYY-MM-DD in the device's timezone (default America/Sao_Paulo), never UTC.
   */
  static getLocalDate(date: Date = new Date()): string {
    const tz = this.getEffectiveTimezone();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  }

  /**
   * Returns HH:mm in the device's timezone (default America/Sao_Paulo)
   */
  static getLocalTime(date: Date = new Date()): string {
    const tz = this.getEffectiveTimezone();
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return formatter.format(date);
  }

  /**
   * Returns ISO local timestamp representation (YYYY-MM-DDTHH:mm:ss) in device timezone
   */
  static getLocalDateTime(date: Date = new Date()): string {
    const datePart = this.getLocalDate(date);
    const timePart = this.getLocalTime(date);
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${datePart}T${timePart}:${seconds}`;
  }

  /**
   * Checks if a given YYYY-MM-DD string is today in the device's timezone
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
      timeZone: this.getEffectiveTimezone(),
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
    return new Date(Date.UTC(year, month - 1, day, 3, 0, 0)); // UTC-3 midnight equivalent
  }

  /**
   * Returns End of Local Day (23:59:59.999)
   */
  static endOfLocalDay(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day + 1, 2, 59, 59, 999));
  }
}
