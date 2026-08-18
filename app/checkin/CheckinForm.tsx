"use client";

import { useEffect, useRef, useState } from "react";

type Done = { name: string; when: string; already: boolean };
type MemberHit = { id: string; name: string; email: string };

export default function CheckinForm({ code }: { code: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberHit[]>([]);
  const [selected, setSelected] = useState<MemberHit | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selected || query.trim().length < 2) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/members/search?q=${encodeURIComponent(query.trim())}`);
        if (!res.ok) return;
        const data = await res.json();
        setResults(data.members || []);
      } catch {
        // The input still works — they just won't see suggestions this keystroke.
      }
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  function onQueryChange(value: string) {
    setQuery(value);
    setSelected(null);
    setOpen(true);
  }

  function pick(member: MemberHit) {
    setSelected(member);
    setQuery(member.name);
    setResults([]);
    setOpen(false);
  }

  async function submit() {
    if (busy || !selected) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, memberId: selected.id }),
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

  const showNoMatch = !selected && query.trim().length >= 2 && results.length === 0;

  return (
    <div className="card">
      <h2 className="title">Almost there</h2>
      <p className="sub">Start typing your name and pick yourself from the list.</p>
      <div className="field autocomplete">
        <label htmlFor="name">Your name</label>
        <input
          id="name"
          type="text"
          autoComplete="off"
          placeholder="e.g. Grace O."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
        />
        {open && !selected && results.length > 0 && (
          <div className="suggestions">
            {results.map((m) => (
              <button type="button" key={m.id} className="suggestion" onMouseDown={() => pick(m)}>
                <span className="s-name">{m.name}</span>
                <span className="s-email">{m.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {showNoMatch && (
        <p className="field-hint">
          Can&apos;t find your name? <a href="/join">Sign up here</a> first, then come back.
        </p>
      )}
      <button className="primary" disabled={busy || !selected} onClick={submit}>
        {busy ? "Checking you in…" : "Check in for today"}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
