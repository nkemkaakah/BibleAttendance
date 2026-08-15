"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [code, setCode] = useState("");
  const [going, setGoing] = useState(false);
  const router = useRouter();

  function go() {
    if (going || code.length < 6) return;
    setGoing(true);
    router.push(`/checkin?code=${encodeURIComponent(code)}`);
  }

  return (
    <main className="shell">
      <div className="brand">
        <span className="dot" aria-hidden />
        <h1>Study Group Attendance</h1>
      </div>

      <div className="card">
        <h2 className="title">Mark your attendance</h2>
        <p className="sub">
          Scan today&apos;s QR code, or type the code from the group below.
        </p>
        <div className="field">
          <label htmlFor="code">Today&apos;s code</label>
          <input
            id="code"
            className="code-input"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={6}
            placeholder="ABC123"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().trim())}
            onKeyDown={(e) => e.key === "Enter" && go()}
          />
        </div>
        <button className="primary" disabled={code.length < 6 || going} onClick={go}>
          {going ? "Checking…" : "Continue"}
        </button>
      </div>

      <p className="footer-note">One check-in per person, each day.</p>
    </main>
  );
}
