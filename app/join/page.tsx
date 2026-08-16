"use client";

import { useState } from "react";
import Link from "next/link";
import { isValidEmail } from "@/lib/validate";

type Step = "form" | "confirm" | "done";

export default function JoinPage() {
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validName = name.trim().length >= 2;
  const validEmail = isValidEmail(email);

  function review() {
    if (!validName || !validEmail) return;
    setError(null);
    setStep("confirm");
  }

  async function confirm() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Couldn't save your email. Try again.");
      else setStep("done");
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (step === "done") {
    return (
      <main className="shell">
        <div className="brand">
          <span className="dot" aria-hidden />
          <h1>Attendance</h1>
        </div>
        <div className="card stamp">
          <div className="ring" aria-hidden>
            ✓
          </div>
          <h2>You&apos;re signed up</h2>
          <p className="when">
            Attendance details will be sent to <span className="name">{email}</span>.
          </p>
        </div>
        <p className="footer-note">
          <Link href="/">Back to check-in</Link>
        </p>
      </main>
    );
  }

  if (step === "confirm") {
    return (
      <main className="shell">
        <div className="brand">
          <span className="dot" aria-hidden />
          <h1>Attendance</h1>
        </div>
        <div className="card">
          <h2 className="title">Check before you confirm</h2>
          <div className="warn">
            Make sure this email is correct — if it&apos;s wrong, you&apos;ll miss out on
            attendance and no one will notice until it&apos;s too late.
          </div>
          <div className="row">
            <span>Name</span>
            <span>{name.trim()}</span>
          </div>
          <div className="row">
            <span>Email</span>
            <span>{email.trim()}</span>
          </div>
          <button className="primary" onClick={confirm} disabled={saving}>
            {saving ? "Saving…" : "Yes, this is correct — join"}
          </button>
          <button
            className="ghost"
            style={{ marginTop: 10, width: "100%" }}
            onClick={() => setStep("form")}
            disabled={saving}
          >
            Edit
          </button>
          {error && <div className="error">{error}</div>}
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="brand">
        <span className="dot" aria-hidden />
        <h1>Study Group Attendance</h1>
      </div>
      <div className="card">
        <h2 className="title">Sign up</h2>
        <p className="sub">Enter your name and email for attendance purposes.</p>
        <div className="field">
          <label htmlFor="name">Your name</label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="email">Your email</label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && review()}
          />
        </div>
        <button className="primary" disabled={!validName || !validEmail} onClick={review}>
          Continue
        </button>
      </div>
    </main>
  );
}
