import { Resend } from "resend";
import { appUrl } from "./qr";

// Resend only accepts a `from` on a domain verified in its dashboard.
export const FROM_EMAIL = "KleanseLondon <hello@kleanselondon.co.uk>";
export const ADMIN_NAME = "Tomi";

type Args = {
  to: string;
  code: string;
  dayLabel: string;
  checkinUrl: string;
  qrDataUrl: string;
};

export async function sendCodeEmail({
  to,
  code,
  dayLabel,
  checkinUrl,
  qrDataUrl,
}: Args): Promise<{ sent: boolean; error: string | null }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, error: "RESEND_API_KEY is not set." };
  if (!to) return { sent: false, error: "No email address saved." };

  try {
    const { error } = await new Resend(key).emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `${ADMIN_NAME}, here's your Bible study code for ${dayLabel}`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <p>Hi ${ADMIN_NAME},</p>
          <h2 style="color:#16281e;">${dayLabel}</h2>
          <p style="font-size: 32px; letter-spacing: 6px; font-weight: bold; color:#1f5c39;">${code}</p>
          <p>Works from midnight until <strong>9:00 PM</strong> today, then it stops.</p>
          <p>The QR is attached — save it and post it to the group. Anyone who can't scan can go to <a href="${appUrl()}">${appUrl()}</a> and type the code, or open <a href="${checkinUrl}">this link</a>.</p>
        </div>
      `,
      attachments: [{ filename: `code-${code}.png`, content: qrDataUrl.split(",")[1] }],
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true, error: null };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "Email failed." };
  }
}

// Small enough to stay well clear of Resend's per-second send limit.
const BATCH_SIZE = 5;

/** Sends the same day's code to many recipients: batches run one after another, each batch fully in parallel. */
export async function sendCodeEmailToMany(
  recipients: { email: string }[],
  common: Omit<Args, "to">
): Promise<{ sentCount: number; failed: { email: string; error: string }[] }> {
  const failed: { email: string; error: string }[] = [];
  let sentCount = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((r) => sendCodeEmail({ ...common, to: r.email }))
    );
    results.forEach((result, idx) => {
      if (result.status === "fulfilled" && result.value.sent) {
        sentCount++;
      } else {
        const error = result.status === "fulfilled" ? result.value.error : result.reason?.message;
        failed.push({ email: batch[idx].email, error: error || "Unknown error" });
      }
    });
  }

  return { sentCount, failed };
}
