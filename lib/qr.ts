import QRCode from "qrcode";

/** Deployed base URL, no trailing slash. Empty if unconfigured. */
export function appUrl(): string {
  return (process.env.APP_URL || "").replace(/\/$/, "");
}

/** The link a scanned QR opens. */
export function checkinUrl(code: string): string {
  return `${appUrl()}/checkin?code=${code}`;
}

/** PNG data URL of the QR for a code. Regenerated on demand — nothing is stored. */
export function qrDataUrl(code: string): Promise<string> {
  return QRCode.toDataURL(checkinUrl(code), {
    width: 480,
    margin: 2,
    color: { dark: "#16281e", light: "#ffffff" },
  });
}
