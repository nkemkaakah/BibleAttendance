import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { listMembers } from "@/lib/members";
import { logError } from "@/lib/log";
import { formatDay, formatTime, targetDayKey } from "@/lib/time";

export const dynamic = "force-dynamic";

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvRow(values: (string | number)[]): string {
  return values.map(csvCell).join(",") + "\r\n";
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const day = req.nextUrl.searchParams.get("day") || targetDayKey(new Date());

  try {
    const [{ data: codeRow, error }, members] = await Promise.all([
      db()
        .from("codes")
        .select("day_key, checkins(name, created_at, member_id)")
        .eq("day_key", day)
        .maybeSingle(),
      listMembers(),
    ]);

    if (error) {
      logError("export.query", error, { day });
      return NextResponse.json({ error: "Couldn't load that day's data." }, { status: 500 });
    }
    if (!codeRow) {
      return NextResponse.json({ error: "No code exists for that day." }, { status: 404 });
    }

    const checkins = (codeRow.checkins || []) as { name: string; created_at: string; member_id: string | null }[];
    const entries = checkins
      .map((c) => ({ name: c.name, ts: new Date(c.created_at) }))
      .sort((a, b) => a.ts.getTime() - b.ts.getTime());

    const checkedInMemberIds = new Set(checkins.map((c) => c.member_id).filter(Boolean));
    const notCheckedIn = members
      .filter((m) => !checkedInMemberIds.has(m.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    let csv = "";
    csv += csvRow(["Day", formatDay(day)]);
    csv += csvRow(["Checked in", entries.length]);
    csv += csvRow(["Total members", members.length]);
    csv += csvRow(["Didn't check in", notCheckedIn.length]);
    csv += "\r\n";
    csv += csvRow(["Name", "Time"]);
    for (const e of entries) {
      csv += csvRow([e.name, formatTime(e.ts)]);
    }
    csv += "\r\n";
    csv += csvRow(["Didn't check in", "Email"]);
    for (const m of notCheckedIn) {
      csv += csvRow([m.name, m.email]);
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="attendance-${day}.csv"`,
      },
    });
  } catch (err) {
    logError("export.failed", err, { day });
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
