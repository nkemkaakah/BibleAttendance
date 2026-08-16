"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Entry = { name: string; time: string };
type Day = {
  key: string;
  label: string;
  code: string;
  count: number;
  live: boolean;
  entries: Entry[];
};
type Week = { key: string; label: string; total: number; days: Day[] };
type Current = {
  code: string;
  dayKey: string;
  dayLabel: string;
  live: boolean;
  count: number;
  checkinUrl: string;
  qrDataUrl: string;
};
type Member = { id: string; name: string; email: string };
type LoadResult = "ok" | "unauthorized" | "error";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [checkingStored, setCheckingStored] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [current, setCurrent] = useState<Current | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [email, setEmail] = useState("");
  const [savedEmail, setSavedEmail] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const openInit = useRef(false);

  const [signingIn, setSigningIn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const serverError = useRef<string | null>(null);

  const load = useCallback(async (pw: string): Promise<LoadResult> => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/register", {
        headers: { "x-admin-password": pw },
        cache: "no-store",
      });
      if (res.status === 401) return "unauthorized";
      if (!res.ok) {
        serverError.current = await res
          .json()
          .then((d) => d.error)
          .catch(() => null);
        return "error";
      }
      const data = await res.json();
      setCurrent(data.current || null);
      setWeeks(data.weeks || []);
      setSavedEmail(data.adminEmail || "");
      setEmail((cur) => cur || data.adminEmail || "");
      if (!openInit.current && data.current) {
        setOpenDay(data.current.dayKey);
        openInit.current = true;
      }
      return "ok";
    } catch (err) {
      serverError.current = err instanceof Error ? err.message : null;
      return "error";
    } finally {
      setRefreshing(false);
    }
  }, []);

  const loadMembers = useCallback(async (pw: string) => {
    try {
      const res = await fetch("/api/admin/members", {
        headers: { "x-admin-password": pw },
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setMembers(data.members || []);
    } catch {
      // The register load above already surfaces connectivity errors.
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("adminpw");
    if (!stored) {
      setCheckingStored(false);
      return;
    }
    load(stored).then((result) => {
      if (result === "ok") {
        setPassword(stored);
        setAuthed(true);
        loadMembers(stored);
      } else if (result === "unauthorized") {
        localStorage.removeItem("adminpw");
      }
      setCheckingStored(false);
    });
  }, [load, loadMembers]);

  async function login() {
    if (signingIn) return;
    setSigningIn(true);
    setLoginError(null);
    try {
      const result = await load(password);
      if (result === "ok") {
        localStorage.setItem("adminpw", password);
        setAuthed(true);
        loadMembers(password);
      } else if (result === "unauthorized") {
        setLoginError("That password isn't right.");
      } else {
        setLoginError(
          serverError.current
            ? `Your password is fine — the server failed: ${serverError.current}`
            : "Your password is fine, but the server couldn't be reached."
        );
      }
    } finally {
      setSigningIn(false);
    }
  }

  async function removeMemberRow(id: string) {
    if (removingId) return;
    if (!confirm("Remove this person from the daily email list?")) return;
    setRemovingId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== id));
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Couldn't remove that member.");
      }
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setRemovingId(null);
    }
  }

  async function saveEmail() {
    if (saving) return;
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Couldn't save.");
      else {
        setSavedEmail(data.adminEmail);
        setNotice(
          data.adminEmail
            ? `Each day's code will be emailed to ${data.adminEmail}.`
            : "Email address cleared. No daily emails will be sent."
        );
      }
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function sendNow() {
    if (sending) return;
    setSending(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/send", {
        method: "POST",
        headers: { "x-admin-password": password },
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Couldn't send the email.");
      else setNotice(`Code ${data.code} sent to ${data.sentTo}.`);
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setSending(false);
    }
  }

  if (checkingStored) {
    return (
      <main className="shell wide">
        <p className="empty">Loading…</p>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="shell">
        <div className="brand">
          <span className="dot" aria-hidden />
          <h1>Attendance · Admin</h1>
        </div>
        <div className="card">
          <h2 className="title">Sign in</h2>
          <p className="sub">Enter the admin password to see the register.</p>
          <div className="field">
            <label htmlFor="pw">Password</label>
            <input
              id="pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
            />
          </div>
          <button className="primary" onClick={login} disabled={!password || signingIn}>
            {signingIn ? "Signing in…" : "Sign in"}
          </button>
          {loginError && <div className="error">{loginError}</div>}
        </div>
      </main>
    );
  }

  return (
    <main className="shell wide">
      <div className="admin-head">
        <div className="brand" style={{ marginBottom: 0 }}>
          <span className="dot" aria-hidden />
          <h1>Attendance · Admin</h1>
        </div>
        {refreshing && <span className="working">Refreshing…</span>}
      </div>

      {notice && <div className="notice">{notice}</div>}
      {error && <div className="error" style={{ marginBottom: 16 }}>{error}</div>}

      {current && (
        <div className="card qr-panel">
          <span className={`pill ${current.live ? "active" : "expired"}`}>
            {current.live ? "Live now" : "Starts at midnight"}
          </span>
          <h2 className="title">{current.dayLabel}</h2>
          <div className="big-code">{current.code}</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current.qrDataUrl} alt={`QR code for ${current.code}`} />
          <p className="hint">
            {current.live
              ? "Post this to the group. It stops working at 9:00 PM."
              : "Post this tonight or in the morning. It works from midnight until 9:00 PM."}{" "}
            Anyone who can&apos;t scan can open <a href={current.checkinUrl}>this link</a>.
          </p>
        </div>
      )}

      <div className="card">
        <h2 className="title">Daily email</h2>
        <p className="sub">
          {savedEmail
            ? `The day's code and QR are emailed to ${savedEmail} automatically, every day.`
            : "Add an address below and the day's code will be emailed there automatically, every day."}
        </p>
        <div className="field">
          <label htmlFor="admin-email">
            {savedEmail ? "Change this email" : "Email address"}
          </label>
          <div className="email-row">
            <input
              id="admin-email"
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveEmail()}
            />
            <button className="ghost" onClick={saveEmail} disabled={saving}>
              {saving ? "Saving…" : savedEmail ? "Update" : "Save"}
            </button>
            <button className="ghost" onClick={sendNow} disabled={sending || !savedEmail}>
              {sending ? "Sending…" : "Send today's now"}
            </button>
          </div>
          <p className="field-hint">You can change this any time — type a new address and tap Save.</p>
        </div>
      </div>

      <div className="card">
        <h2 className="title">Members ({members.length})</h2>
        <p className="sub">
          Everyone here gets the day&apos;s code emailed to them automatically at midnight. They
          sign themselves up at <code>/join</code> — you don&apos;t need to add anyone by hand.
        </p>
        {members.length === 0 && <p className="empty">No one has signed up yet.</p>}
        {members.map((m) => (
          <div className="row" key={m.id}>
            <span>
              {m.name} <span className="member-email">— {m.email}</span>
            </span>
            <button
              className="ghost small"
              onClick={() => removeMemberRow(m.id)}
              disabled={removingId === m.id}
            >
              {removingId === m.id ? "Removing…" : "Remove"}
            </button>
          </div>
        ))}
      </div>

      {weeks.map((week) => (
        <section className="week" key={week.key}>
          <div className="week-title">
            <h3>{week.label}</h3>
            <span className="count">
              {week.total} check-in{week.total === 1 ? "" : "s"}
            </span>
          </div>
          {week.days.map((day) => (
            <div key={day.key}>
              <button
                className="week-head"
                onClick={() => setOpenDay(openDay === day.key ? null : day.key)}
                aria-expanded={openDay === day.key}
              >
                <div>
                  <div className="code">{day.label}</div>
                  <div className="range">{day.code}</div>
                </div>
                <div className="head-right">
                  <span className="count">{day.count}</span>
                  {day.live && <span className="pill active">Live</span>}
                </div>
              </button>
              {openDay === day.key && (
                <div className="week-body">
                  {day.entries.length === 0 && <p className="empty">No one checked in.</p>}
                  {day.entries.map((entry, i) => (
                    <div className="row" key={i}>
                      <span>{entry.name}</span>
                      <span className="time">{entry.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      ))}
    </main>
  );
}
