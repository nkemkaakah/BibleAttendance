import { NextRequest } from "next/server";

/** True if the request carries the correct admin password header. */
export function isAdmin(req: NextRequest): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return req.headers.get("x-admin-password") === expected;
}
