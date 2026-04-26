"use client";

import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AdminCallResult = { ok: true; body: unknown } | { ok: false; error: string };

async function adminCall(path: string, init?: RequestInit): Promise<AdminCallResult> {
  const supabase = createSupabaseBrowserClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    return { ok: false, error: "Not signed in" };
  }
  const res = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `Request failed (${res.status})`;
    return { ok: false, error: err };
  }
  return { ok: true, body };
}

function ResultDisplay({ label, result }: { label: string; result: AdminCallResult | null }) {
  if (!result) return null;
  return (
    <p className={`form-message ${result.ok ? "form-success" : ""}`}>
      <strong>{label}:</strong>{" "}
      {result.ok ? JSON.stringify(result.body) : result.error}
    </p>
  );
}

export function AdminTestingToolkit() {
  const [results, setResults] = useState<Record<string, AdminCallResult | null>>({});
  const [pending, setPending] = useState<string | null>(null);

  // dry-run form
  const [dryRunUserId, setDryRunUserId] = useState("");
  // time-travel form
  const [ttA, setTtA] = useState("");
  const [ttB, setTtB] = useState("");
  const [ttDays, setTtDays] = useState("8");

  const run = async (key: string, fn: () => Promise<AdminCallResult>) => {
    setPending(key);
    setResults((prev) => ({ ...prev, [key]: null }));
    const result = await fn();
    setResults((prev) => ({ ...prev, [key]: result }));
    setPending(null);
  };

  return (
    <>
      <div className="stack-md">
        <h2>Test fixtures</h2>
        <p className="meta">
          Spawn or wipe synthetic Test Family circles. The spawned circle is
          named &ldquo;Test Family ⌚ &lt;timestamp&gt;&rdquo; and contains 6
          members + relationships + weekday availability.
        </p>
        <div className="pill-row">
          <button
            type="button"
            className="button button-secondary"
            disabled={pending === "spawn"}
            onClick={() =>
              run("spawn", () =>
                adminCall("/api/admin/test-fixtures/family", { method: "POST" })
              )
            }
          >
            {pending === "spawn" ? "Spawning..." : "Spawn test family"}
          </button>
          <button
            type="button"
            className="button button-secondary"
            disabled={pending === "wipe"}
            onClick={() =>
              run("wipe", () =>
                adminCall("/api/admin/test-fixtures/wipe", { method: "POST" })
              )
            }
          >
            {pending === "wipe" ? "Wiping..." : "Wipe test families"}
          </button>
        </div>
        <ResultDisplay label="spawn" result={results.spawn ?? null} />
        <ResultDisplay label="wipe" result={results.wipe ?? null} />
      </div>

      <div className="stack-md">
        <h2>Cron triggers</h2>
        <p className="meta">
          Bypass the schedule and run each cron immediately. Useful for
          driving the engines through a single test cycle.
        </p>
        <div className="pill-row">
          <button
            type="button"
            className="button button-secondary"
            disabled={pending === "cron-sweep"}
            onClick={() =>
              run("cron-sweep", () =>
                adminCall("/api/admin/cron/sweep", { method: "POST" })
              )
            }
          >
            {pending === "cron-sweep" ? "Running..." : "Run notification sweep"}
          </button>
          <button
            type="button"
            className="button button-secondary"
            disabled={pending === "cron-auto"}
            onClick={() =>
              run("cron-auto", () =>
                adminCall("/api/admin/cron/auto-schedule", { method: "POST" })
              )
            }
          >
            {pending === "cron-auto" ? "Running..." : "Run auto-schedule"}
          </button>
          <button
            type="button"
            className="button button-secondary"
            disabled={pending === "cron-rec"}
            onClick={() =>
              run("cron-rec", () =>
                adminCall("/api/admin/cron/recurrence-materialize", {
                  method: "POST",
                })
              )
            }
          >
            {pending === "cron-rec" ? "Running..." : "Materialize recurrences"}
          </button>
        </div>
        <ResultDisplay label="sweep" result={results["cron-sweep"] ?? null} />
        <ResultDisplay label="auto-schedule" result={results["cron-auto"] ?? null} />
        <ResultDisplay label="recurrence" result={results["cron-rec"] ?? null} />
      </div>

      <div className="stack-md">
        <h2>Auto-schedule dry-run</h2>
        <p className="meta">
          Paste a user UUID. Returns the JSON of would-be calls without
          inserting anything.
        </p>
        <input
          className="form-input"
          value={dryRunUserId}
          onChange={(e) => setDryRunUserId(e.target.value)}
          placeholder="user UUID"
        />
        <button
          type="button"
          className="button button-secondary"
          disabled={!dryRunUserId || pending === "dry-run"}
          onClick={() =>
            run("dry-run", () =>
              adminCall("/api/admin/auto-schedule/run", {
                method: "POST",
                body: JSON.stringify({ userId: dryRunUserId, dryRun: true }),
              })
            )
          }
        >
          {pending === "dry-run" ? "Running..." : "Dry run"}
        </button>
        <ResultDisplay label="proposals" result={results["dry-run"] ?? null} />
      </div>

      <div className="stack-md">
        <h2>Time-travel last connection</h2>
        <p className="meta">
          Shift the most recent shared call between two memberships back by
          N days (or insert a synthetic completed call if none exists). Used
          to expire cooldowns on demand.
        </p>
        <input
          className="form-input"
          value={ttA}
          onChange={(e) => setTtA(e.target.value)}
          placeholder="membership A UUID"
        />
        <input
          className="form-input"
          value={ttB}
          onChange={(e) => setTtB(e.target.value)}
          placeholder="membership B UUID"
        />
        <input
          className="form-input"
          value={ttDays}
          onChange={(e) => setTtDays(e.target.value)}
          placeholder="days ago"
          inputMode="numeric"
        />
        <button
          type="button"
          className="button button-secondary"
          disabled={!ttA || !ttB || pending === "tt"}
          onClick={() =>
            run("tt", () =>
              adminCall("/api/admin/time-travel/connection", {
                method: "POST",
                body: JSON.stringify({
                  membershipA: ttA,
                  membershipB: ttB,
                  daysAgo: Number.parseInt(ttDays, 10) || 0,
                }),
              })
            )
          }
        >
          {pending === "tt" ? "Working..." : "Time-travel"}
        </button>
        <ResultDisplay label="time-travel" result={results.tt ?? null} />
      </div>

      <div className="stack-md">
        <h2>Audit log</h2>
        <button
          type="button"
          className="button button-secondary"
          disabled={pending === "audit"}
          onClick={() =>
            run("audit", () => adminCall("/api/admin/audit?limit=20"))
          }
        >
          {pending === "audit" ? "Loading..." : "Load most recent 20"}
        </button>
        {results.audit?.ok && results.audit.body ? (
          <pre className="payload">
            {JSON.stringify((results.audit.body as { entries: unknown }).entries, null, 2)}
          </pre>
        ) : null}
        {results.audit && !results.audit.ok ? (
          <p className="form-message">{results.audit.error}</p>
        ) : null}
      </div>
    </>
  );
}
