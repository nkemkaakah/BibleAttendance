"use client";

import { useState } from "react";

type Done = { name: string; when: string; already: boolean };

export default function CheckinForm({ code }: { code: string }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);

  async function submit() {
    if (busy || name.trim().length < 2) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setDone({ name: data.name, when: data.when, already: data.already });
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card stamp">
        <div className="ring" aria-hidden>
          ✓
        </div>
        <h2>{done.already ? "Already checked in" : "You're checked in"}</h2>
        <p className="when">
          <span className="name">{done.name}</span>
          {done.already ? " — your attendance for today was already recorded." : ` · ${done.when}`}
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="title">Almost there</h2>
      <p className="sub">Enter your name exactly as the group knows you, then confirm.</p>
      <div className="field">
        <label htmlFor="name">Your name</label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          placeholder="e.g. Grace O."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
      </div>
      <button className="primary" disabled={busy || name.trim().length < 2} onClick={submit}>
        {busy ? "Checking you in…" : "Check in for today"}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
