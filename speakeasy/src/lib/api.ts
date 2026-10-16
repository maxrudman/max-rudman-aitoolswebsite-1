// Browser-side fetch helper. Throws ApiError with the server's friendly message.

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public retryable = false,
    public fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: options.method ?? (options.body ? "POST" : "GET"),
      headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError("You appear to be offline. Check your connection and try again.", 0, true);
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith("/api/auth/")) {
    window.location.href = "/login";
  }
  if (!res.ok) {
    throw new ApiError(data.error ?? "Something went wrong. Please try again.", res.status, data.retryable ?? res.status >= 500, data.fieldErrors ?? {});
  }
  return data as T;
}

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong.");
