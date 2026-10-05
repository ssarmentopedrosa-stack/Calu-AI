/**
 * Resilient executor with backoff, AbortSignal timeout, 5xx-only retry filtering (never 400/429),
 * and retry-after header parsing.
 */
export async function executeWithRetry<T>(
  fn: (signal?: AbortSignal) => Promise<T>,
  timeoutMs: number,
  operationName: string,
  maxRetries = 2
): Promise<T> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort(new Error('AI_TIMEOUT'));
    }, timeoutMs);

    try {
      const result = await fn(controller.signal);
      clearTimeout(timer);
      return result;
    } catch (err: any) {
      clearTimeout(timer);
      const status =
        err?.status ||
        err?.statusCode ||
        (err?.response && (err.response.status || err.response.statusCode));

      // Strictly DO NOT retry on 400 or 429 (or client 4xx errors)
      if (
        status === 400 ||
        status === 429 ||
        (typeof status === 'number' && status >= 400 && status < 500)
      ) {
        console.warn(
          `[executeWithRetry] Erro 4xx não repetível (${status}) em ${operationName}:`,
          err?.message
        );
        throw err;
      }

      // Only retry on 5xx or timeout
      const isTimeout =
        timedOut ||
        err?.name === 'AbortError' ||
        err?.message?.includes('TIMEOUT') ||
        err?.message?.includes('AI_TIMEOUT') ||
        err?.code === 'ETIMEDOUT' ||
        err?.code === 'ECONNRESET';
      const is5xx = typeof status === 'number' && status >= 500 && status < 600;

      if (!isTimeout && !is5xx && status !== undefined) {
        throw err;
      }

      attempt++;
      if (attempt > maxRetries) {
        console.error(
          `[executeWithRetry] Falha final em ${operationName} após ${attempt} tentativas:`,
          err?.message || err
        );
        throw err;
      }

      // Respect Retry-After header if provided
      let backoffMs = attempt * 400;
      const retryAfterHeader =
        err?.headers?.get?.('retry-after') ||
        err?.response?.headers?.['retry-after'] ||
        err?.retryAfter;
      if (retryAfterHeader) {
        const parsed = parseInt(String(retryAfterHeader), 10);
        if (!isNaN(parsed) && parsed > 0) {
          backoffMs = Math.max(backoffMs, Math.min(parsed * 1000, 10000));
        }
      }

      await new Promise(res => setTimeout(res, backoffMs));
    }
  }
  throw new Error('AI_UNAVAILABLE');
}
