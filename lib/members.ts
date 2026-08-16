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

export async function removeMember(id: string): Promise<void> {
  const { error } = await db().from("members").delete().eq("id", id);
  if (error) {
    logError("members.remove", error, { id });
    throw new Error("Couldn't remove that member.");
  }
}
