import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { ensureCode } from "@/lib/codes";
import { getAdminEmail } from "@/lib/settings";
import { checkinUrl, qrDataUrl } from "@/lib/qr";
import { logError, logInfo } from "@/lib/log";
import { formatDay, formatTime, formatWeek, targetDayKey, weekStartKey } from "@/lib/time";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  code: string;
  day_key: string;
  starts_at: string;
  expires_at: string;
  checkins: { name: string; created_at: string }[] | null;
};

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    logInfo("register.unauthorized", {});
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayKey = targetDayKey(now);

  try {
    // Self-healing: if the daily job hasn't run, the code exists by the time she looks.
    const { created } = await ensureCode(todayKey);
    if (created) logInfo("register.codeCreated", { day: todayKey });

    const { data, error } = await db()
      .from("codes")
      .select("id, code, day_key, starts_at, expires_at, checkins(name, created_at)")
      .order("day_key", { ascending: false });

    if (error) {
      logError("register.query", error);
      return NextResponse.json(
        { error: "Couldn't load the register from the database." },
        { status: 500 }
      );
    }

    const rows = (data || []) as Row[];

    const days = rows.map((r) => {
      const entries = (r.checkins || [])
        .map((c) => ({
          name: c.name,
          time: formatTime(new Date(c.created_at)),
          ts: new Date(c.created_at).getTime(),
        }))
        .sort((a, b) => a.ts - b.ts)
        .map(({ name, time }) => ({ name, time }));

      return {
        key: r.day_key,
        label: formatDay(r.day_key),
        code: r.code,
        count: entries.length,
        live: now >= new Date(r.starts_at) && now < new Date(r.expires_at),
        entries,
      };
    });

    const byWeek = new Map<string, typeof days>();
    for (const day of days) {
      const week = weekStartKey(day.key);
      byWeek.set(week, [...(byWeek.get(week) || []), day]);
    }

    const weeks = Array.from(byWeek.entries())
      .sort((a, b) => (a[0] > b[0] ? -1 : 1))
      .map(([key, list]) => ({
        key,
        label: formatWeek(key),
        total: list.reduce((sum, d) => sum + d.count, 0),
        days: [...list].sort((a, b) => (a.key < b.key ? -1 : 1)),
      }));

    const today = days.find((d) => d.key === todayKey);
    const current = today
      ? {
          code: today.code,
          dayKey: today.key,
          dayLabel: today.label,
          live: today.live,
          count: today.count,
          checkinUrl: checkinUrl(today.code),
          qrDataUrl: await qrDataUrl(today.code),
        }
      : null;

    logInfo("register.ok", { day: todayKey, days: days.length, weeks: weeks.length });
    return NextResponse.json({ current, weeks, adminEmail: await getAdminEmail() });
  } catch (err) {
    logError("register.failed", err, { day: todayKey });
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
