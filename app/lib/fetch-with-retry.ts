const RETRYABLE_STATUS_CODES = new Set([401, 403, 408, 429]);

function isRetryableResponse(response: Response) {
  return RETRYABLE_STATUS_CODES.has(response.status) || response.status >= 500;
}

function wait(delayMs: number, signal?: AbortSignal | null) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
      return;
    }

    const timeoutId = window.setTimeout(resolve, delayMs);
    signal?.addEventListener('abort', () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    }, { once: true });
  });
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit = {},
  retries = 1,
  delayMs = 300
) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(input, init);
      if (!isRetryableResponse(response) || attempt === retries) return response;
    } catch (error) {
      if (init.signal?.aborted) throw error;
      lastError = error;
      if (attempt === retries) throw error;
    }

    await wait(delayMs, init.signal);
  }

  throw lastError instanceof Error ? lastError : new Error('Požadavek se nepodařilo dokončit.');
}
