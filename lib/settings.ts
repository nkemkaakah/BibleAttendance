import { db } from "./db";
import { logError } from "./log";

/** Where the daily code is emailed. Set by the admin on /admin. */
export async function getAdminEmail(): Promise<string> {
  const { data, error } = await db()
    .from("settings")
    .select("admin_email")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    logError("settings.read", error);
    return "";
  }
  return data?.admin_email || "";
}

export async function setAdminEmail(email: string): Promise<void> {
  const { error } = await db()
    .from("settings")
    .upsert({ id: 1, admin_email: email.trim() || null });
  if (error) {
    logError("settings.write", error);
    throw new Error("Couldn't save the email address.");
  }
}
