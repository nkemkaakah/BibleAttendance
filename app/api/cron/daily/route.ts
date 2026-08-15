import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { ensureCode } from "@/lib/codes";
import { getAdminEmail } from "@/lib/settings";
import { sendCodeEmail } from "@/lib/email";
import { checkinUrl, qrDataUrl } from "@/lib/qr";
import { logError, logInfo } from "@/lib/log";
import { formatDay, targetDayKey } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
  const secret = process.env.CRON_SECRET;
  const allowed = secret
    ? req.headers.get("authorization") === `Bearer ${secret}`
    : isAdmin(req);
  if (!allowed) {
    logInfo("cron.unauthorized", { hasSecret: Boolean(secret) });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = targetDayKey(new Date());

  try {
    const { row, created } = await ensureCode(key);
    const to = await getAdminEmail();

    if (!to) {
      logInfo("cron.noRecipient", { day: key, code: row.code, created });
      return NextResponse.json({ code: row.code, day: key, created, emailed: false });
    }

    const { sent, error } = await sendCodeEmail({
      to,
      code: row.code,
      dayLabel: formatDay(row.day_key),
      checkinUrl: checkinUrl(row.code),
      qrDataUrl: await qrDataUrl(row.code),
    });

    if (sent) logInfo("cron.sent", { day: key, code: row.code, to, created });
    else logError("cron.emailFailed", new Error(error || "unknown"), { day: key, to });

    return NextResponse.json({
      code: row.code,
      day: key,
      created,
      emailed: sent,
      emailError: error,
    });
  } catch (err) {
    logError("cron.failed", err, { day: key });
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
