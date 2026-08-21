import { db } from "./db";
import { dayWindow } from "./time";
import { logError, logInfo } from "./log";

// No 0/O or 1/I/L, so the code is easy to read aloud and type.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export type CodeRow = {
  id: string;
  code: string;
  day_key: string;
  starts_at: string;
  expires_at: string;
};

const COLUMNS = "id, code, day_key, starts_at, expires_at";

function newCode(): string {
  let out = "";
  for (let i = 0; i < 6; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return out;
}

async function findByDay(key: string): Promise<CodeRow | null> {
  const { data, error } = await db().from("codes").select(COLUMNS).eq("day_key", key).maybeSingle();
  if (error) {
    logError("codes.findByDay", error, { day: key });
    throw new Error("Couldn't check for an existing code.");
  }
  return (data as CodeRow) || null;
}

/** Returns the code for a day, creating it if it doesn't exist yet. */
export async function ensureCode(key: string): Promise<{ row: CodeRow; created: boolean }> {
  const existing = await findByDay(key);
  if (existing) return { row: existing, created: false };

  const { startsAt, expiresAt } = dayWindow(key);
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await db()
      .from("codes")
      .insert({
        code: newCode(),
        day_key: key,
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select(COLUMNS)
      .single();

    if (!error) {
      logInfo("codes.created", { day: key, code: (data as CodeRow).code });
      return { row: data as CodeRow, created: true };
    }
    if (error.code !== "23505") {
      logError("codes.insert", error, { day: key });
      throw new Error("Couldn't create the code.");
    }

    // Either the random string collided or another request won the race for this day.
    const winner = await findByDay(key);
    if (winner) return { row: winner, created: false };
    logInfo("codes.retry", { day: key, attempt });
  }
  logError("codes.exhausted", new Error("no code after 5 attempts"), { day: key });
  throw new Error("Couldn't create the code.");
}
