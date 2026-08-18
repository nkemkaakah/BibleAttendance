import { NextRequest, NextResponse } from "next/server";
import { searchMembers } from "@/lib/members";
import { logError } from "@/lib/log";

export const dynamic = "force-dynamic";

// Public and unauthenticated on purpose: it backs the name typeahead on the
// public /checkin page, before anyone has signed in as anything.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  try {
    return NextResponse.json({ members: await searchMembers(q) });
  } catch (err) {
    logError("members.search.route", err, { q });
    return NextResponse.json({ error: "Couldn't search members." }, { status: 500 });
  }
}
