import { NextRequest, NextResponse } from "next/server";
import { addMember } from "@/lib/members";
import { isValidEmail } from "@/lib/validate";
import { logError, logInfo } from "@/lib/log";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { name?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = (body.name || "").trim().replace(/\s+/g, " ");
  const email = (body.email || "").trim();

  if (name.length < 2 || name.length > 60) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "That doesn't look like an email address." }, { status: 400 });
  }

  try {
    const { created } = await addMember(name, email);
    logInfo("join.ok", { email, created });
    return NextResponse.json({ joined: true });
  } catch (err) {
    logError("join.failed", err, { email });
    const message = err instanceof Error ? err.message : "Couldn't save your email.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
