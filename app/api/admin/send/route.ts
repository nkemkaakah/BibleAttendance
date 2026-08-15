import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { ensureCode } from "@/lib/codes";
import { getAdminEmail } from "@/lib/settings";
import { sendCodeEmail } from "@/lib/email";
import { checkinUrl, qrDataUrl } from "@/lib/qr";
import { logError, logInfo } from "@/lib/log";
import { formatDay, targetDayKey } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const to = await getAdminEmail();
    if (!to) {
      return NextResponse.json({ error: "Save an email address first." }, { status: 400 });
    }

    const key = targetDayKey(new Date());
    const { row } = await ensureCode(key);

    const { sent, error } = await sendCodeEmail({
      to,
      code: row.code,
      dayLabel: formatDay(row.day_key),
      checkinUrl: checkinUrl(row.code),
      qrDataUrl: await qrDataUrl(row.code),
    });

    if (!sent) {
      logError("send.emailFailed", new Error(error || "unknown"), { to, code: row.code });
      return NextResponse.json({ error: error || "Email failed." }, { status: 502 });
    }

    logInfo("send.ok", { to, code: row.code });
    return NextResponse.json({ sentTo: to, code: row.code });
  } catch (err) {
    logError("send.failed", err);
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
