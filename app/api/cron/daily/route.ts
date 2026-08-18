import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { ensureCode } from "@/lib/codes";
import { getAdminEmail } from "@/lib/settings";
import { listMembers } from "@/lib/members";
import { sendCodeEmail, sendCodeEmailToMany } from "@/lib/email";
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
    const common = {
      code: row.code,
      dayLabel: formatDay(row.day_key),
      checkinUrl: checkinUrl(row.code),
      qrDataUrl: await qrDataUrl(row.code),
    };

    const to = await getAdminEmail();
    let emailed = false;
    let emailError: string | null = null;
    if (to) {
      const result = await sendCodeEmail({ to, ...common });
      emailed = result.sent;
      emailError = result.error;
      if (emailed) logInfo("cron.sent", { day: key, code: row.code, to, created });
      else logError("cron.emailFailed", new Error(emailError || "unknown"), { day: key, to });
    } else {
      logInfo("cron.noRecipient", { day: key, code: row.code, created });
    }

    const members = await listMembers();
    const { sentCount, failed } = await sendCodeEmailToMany(members, common, to);
    logInfo("cron.membersSent", {
      day: key,
      total: members.length,
      sentCount,
      failedCount: failed.length,
    });
    if (failed.length) {
      logError("cron.membersFailed", new Error("some member emails failed"), { day: key, failed });
    }

    return NextResponse.json({
      code: row.code,
      day: key,
      created,
      emailed,
      emailError,
      members: { total: members.length, sent: sentCount, failed: failed.length },
    });
  } catch (err) {
    logError("cron.failed", err, { day: key });
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
