import Link from "next/link";
import { db } from "@/lib/db";
import { formatDay } from "@/lib/time";
import CheckinForm from "./CheckinForm";

export const dynamic = "force-dynamic";

function Message({ title, message }: { title: string; message: string }) {
  return (
    <main className="shell">
      <div className="brand">
        <span className="dot" aria-hidden />
        <h1>Study Group Attendance</h1>
      </div>
      <div className="card">
        <h2 className="title">{title}</h2>
        <p className="sub">{message}</p>
        <Link href="/">Enter a code instead</Link>
      </div>
    </main>
  );
}

export default async function CheckinPage({
  searchParams,
}: {
  searchParams: { code?: string };
}) {
  const raw = (searchParams.code || "").toUpperCase().trim();
  if (!raw) {
    return (
      <Message
        title="No code found"
        message="This link is missing a code. Go back and type today's code from the group."
      />
    );
  }

  const { data: codeRow } = await db()
    .from("codes")
    .select("code, day_key, starts_at, expires_at")
    .eq("code", raw)
    .maybeSingle();

  if (!codeRow) {
    return (
      <Message
        title="Code not recognised"
        message={`"${raw}" doesn't match any code. Check the group for today's one.`}
      />
    );
  }

  const now = new Date();
  if (now < new Date(codeRow.starts_at)) {
    return (
      <Message
        title="Not active yet"
        message={`This is the code for ${formatDay(codeRow.day_key)}. It starts working at midnight.`}
      />
    );
  }
  if (now >= new Date(codeRow.expires_at)) {
    return (
      <Message
        title="Closed for the day"
        message={`This was the code for ${formatDay(
          codeRow.day_key
        )}, and check-in closed at 9:00 PM. Check the group for today's code.`}
      />
    );
  }

  return (
    <main className="shell">
      <div className="brand">
        <span className="dot" aria-hidden />
        <h1>Study Group Attendance</h1>
      </div>
      <p className="day-banner">{formatDay(codeRow.day_key)}</p>
      <CheckinForm code={codeRow.code} />
      <p className="footer-note">Check-in closes at 9:00 PM.</p>
    </main>
  );
}
