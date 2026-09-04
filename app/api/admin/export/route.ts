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
        .select("day_key, checkins(name, created_at)")
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

    const entries = ((codeRow.checkins || []) as { name: string; created_at: string }[])
      .map((c) => ({ name: c.name, ts: new Date(c.created_at) }))
      .sort((a, b) => a.ts.getTime() - b.ts.getTime());

    let csv = "";
    csv += csvRow(["Day", formatDay(day)]);
    csv += csvRow(["Checked in", entries.length]);
    csv += csvRow(["Total members", members.length]);
    csv += "\r\n";
    csv += csvRow(["Name", "Time"]);
    for (const e of entries) {
      csv += csvRow([e.name, formatTime(e.ts)]);
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
