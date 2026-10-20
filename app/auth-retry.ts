// Supabase sometimes rejects a freshly refreshed login token with
// "JWT issued at future" (PGRST303): the token's timestamp is a few seconds
// ahead of the database server's clock. Waiting briefly and retrying fixes it.
type Result = { error: unknown; status?: number };

export const isAuthTimingError = (result: Result | null | undefined) => {
  const error = result?.error as { code?: unknown; message?: unknown } | null | undefined;
  if (!error) return false;
  const message = typeof error.message === "string" ? error.message : "";
  return error.code === "PGRST303" || /jwt issued at future/i.test(message) || (result?.status === 401 && !message.trim());
};

export async function retryAuthTiming<T extends Result>(run: () => PromiseLike<T>, delays = [1200, 2500], wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))): Promise<T> {
  let result = await run();
  for (const delay of delays) {
    if (!isAuthTimingError(result)) break;
    await wait(delay);
    result = await run();
  }
  return result;
}
