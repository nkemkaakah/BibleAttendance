import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAdminEmail, setAdminEmail } from "@/lib/settings";
import { isValidEmail } from "@/lib/validate";
import { logError, logInfo } from "@/lib/log";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let email = "";
  try {
    const body = await req.json();
    email = (body?.email || "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (email && !isValidEmail(email)) {
    return NextResponse.json({ error: "That doesn't look like an email address." }, { status: 400 });
  }

  try {
    await setAdminEmail(email);
    logInfo("settings.saved", { email: email || "(cleared)" });
    return NextResponse.json({ adminEmail: await getAdminEmail() });
  } catch (err) {
    logError("settings.save", err);
    const message = err instanceof Error ? err.message : "Couldn't save.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
