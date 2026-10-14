export const errorMetadata = (
  error: unknown,
  source: string,
  fallbackCode: string,
  response?: { status?: number; statusText?: string },
): Record<string, string | number | boolean> => {
  const value = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const status = typeof value.status === "number" ? value.status : response?.status || 0;
  const rawMessage = error instanceof Error ? error.message : typeof value.message === "string" ? value.message : "";
  const message = rawMessage.trim()
    || (typeof value.details === "string" && value.details.trim())
    || response?.statusText?.trim()
    || (status ? `HTTP ${status} with no error body` : "No error details (likely network or offline)");
  return {
    code: fallbackCode,
    source,
    error_code: String(value.code || value.name || "unknown").slice(0, 60),
    status,
    message: message.slice(0, 180),
    hint: typeof value.hint === "string" ? value.hint.slice(0, 180) : "",
  };
};
