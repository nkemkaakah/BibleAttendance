type Detail = Record<string, unknown>;

export function logInfo(scope: string, detail: Detail = {}): void {
  console.log(`[${scope}]`, JSON.stringify(detail));
}

/** Logs the real cause. Supabase errors carry code/details/hint that the UI never shows. */
export function logError(scope: string, err: unknown, detail: Detail = {}): void {
  const e = err as { message?: string; code?: string; details?: string; hint?: string };
  console.error(
    `[${scope}]`,
    JSON.stringify({
      message: e?.message ?? String(err),
      code: e?.code,
      details: e?.details,
      hint: e?.hint,
      ...detail,
    })
  );
}
