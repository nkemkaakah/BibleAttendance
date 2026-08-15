import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formatTime } from "@/lib/time";
import { logError, logInfo } from "@/lib/log";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { code?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const code = (body.code || "").toUpperCase().trim();
  const name = (body.name || "").trim().replace(/\s+/g, " ");

  if (!code || name.length < 2 || name.length > 60) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }

  const { data: codeRow } = await db()
    .from("codes")
    .select("id, starts_at, expires_at")
    .eq("code", code)
    .maybeSingle();

  if (!codeRow) {
    return NextResponse.json({ error: "That code isn't recognised." }, { status: 404 });
  }

  const now = new Date();
  if (now < new Date(codeRow.starts_at)) {
    return NextResponse.json(
      { error: "This code isn't active yet. It starts at midnight." },
      { status: 425 }
    );
  }
  if (now >= new Date(codeRow.expires_at)) {
    return NextResponse.json(
      { error: "This code has closed for the day. Check the group for today's code." },
      { status: 410 }
    );
  }

  const { error } = await db().from("checkins").insert({
    code_id: codeRow.id,
    name,
    name_key: name.toLowerCase(),
  });

  if (error && error.code === "23505") {
    logInfo("checkin.repeat", { code, name });
    return NextResponse.json({ name, when: formatTime(now), already: true });
  }
  if (error) {
    logError("checkin.insert", error, { code, name });
    return NextResponse.json(
      { error: "Couldn't save your check-in. Please try again." },
      { status: 500 }
    );
  }

  logInfo("checkin.ok", { code, name });
  return NextResponse.json({ name, when: formatTime(now), already: false });
}
