import { db } from "./db";
import { logError } from "./log";

export type Member = { id: string; name: string; email: string };

const COLUMNS = "id, name, email";

/** Adds a member, or returns the existing one if that email already signed up. */
export async function addMember(name: string, email: string): Promise<{ member: Member; created: boolean }> {
  const emailKey = email.trim().toLowerCase();

  const { data: existing } = await db().from("members").select(COLUMNS).eq("email_key", emailKey).maybeSingle();
  if (existing) return { member: existing as Member, created: false };

  const { data, error } = await db()
    .from("members")
    .insert({ name: name.trim(), email: email.trim(), email_key: emailKey })
    .select(COLUMNS)
    .single();

  if (!error) return { member: data as Member, created: true };

  if (error.code === "23505") {
    // Someone else signed up with the same email between our check and insert.
    const { data: winner } = await db().from("members").select(COLUMNS).eq("email_key", emailKey).maybeSingle();
    if (winner) return { member: winner as Member, created: false };
  }

  logError("members.add", error, { emailKey });
  throw new Error("Couldn't save your email.");
}

export async function listMembers(): Promise<Member[]> {
  const { data, error } = await db().from("members").select(COLUMNS).order("created_at", { ascending: false });
  if (error) {
    logError("members.list", error);
    throw new Error("Couldn't load members.");
  }
  return (data as Member[]) || [];
}

export async function getMemberById(id: string): Promise<Member | null> {
  const { data, error } = await db().from("members").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) {
    logError("members.getById", error, { id });
    throw new Error("Couldn't look up that member.");
  }
  return (data as Member) || null;
}

/** Name matches for the check-in typeahead. Requires 2+ characters so it doesn't dump the whole list on one keystroke. */
export async function searchMembers(query: string): Promise<Member[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const { data, error } = await db()
    .from("members")
    .select(COLUMNS)
    .ilike("name", `%${q}%`)
    .order("name", { ascending: true })
    .limit(8);
  if (error) {
    logError("members.search", error, { q });
    throw new Error("Couldn't search members.");
  }
  return (data as Member[]) || [];
}

/** Every member with how many times they've checked in during the given "YYYY-MM" month. */
export async function listMembersWithCounts(month: string): Promise<(Member & { count: number })[]> {
  const members = await listMembers();

  const { data, error } = await db()
    .from("checkins")
    .select("member_id, codes!inner(day_key)")
    .not("member_id", "is", null)
    .like("codes.day_key", `${month}%`);
  if (error) {
    logError("members.counts", error, { month });
    throw new Error("Couldn't load attendance counts.");
  }

  const counts = new Map<string, number>();
  for (const row of (data as { member_id: string }[]) || []) {
    counts.set(row.member_id, (counts.get(row.member_id) || 0) + 1);
  }

  return members.map((m) => ({ ...m, count: counts.get(m.id) || 0 }));
}

export async function removeMember(id: string): Promise<void> {
  const { error } = await db().from("members").delete().eq("id", id);
  if (error) {
    logError("members.remove", error, { id });
    throw new Error("Couldn't remove that member.");
  }
}
