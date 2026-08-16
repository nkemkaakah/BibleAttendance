import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { listMembers, removeMember } from "@/lib/members";
import { logError } from "@/lib/log";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ members: await listMembers() });
  } catch (err) {
    logError("members.list.route", err);
    const message = err instanceof Error ? err.message : "Couldn't load members.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let id = "";
  try {
    const body = await req.json();
    id = body?.id || "";
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  try {
    await removeMember(id);
    return NextResponse.json({ removed: true });
  } catch (err) {
    logError("members.remove.route", err, { id });
    const message = err instanceof Error ? err.message : "Couldn't remove that member.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
