"use client";

import { useCallback, useEffect, useState } from "react";

import type { LocationShare } from "@/lib/location-sharing";

type Response = { needsOnboarding: boolean; viewerShare: LocationShare | null; shares: LocationShare[] };

export function LocationSharingPanel() {
  const [data, setData] = useState<Response | null>(null);
  const [durationHours, setDurationHours] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/location", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Could not load family locations.");
    setData(body);
  }, []);

  useEffect(() => { load().catch((error) => setMessage(error.message)); }, [load]);

  const share = () => {
    if (!navigator.geolocation) { setMessage("Location sharing is not available in this browser."); return; }
    setBusy(true); setMessage("Finding your current location…");
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const response = await fetch("/api/location", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracyMeters: position.coords.accuracy, durationHours }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Could not share your location.");
        setMessage(body.recipientCount ? `Shared with ${body.recipientCount} immediate family ${body.recipientCount === 1 ? "member" : "members"}.` : "Saved. No active immediate family members are connected yet.");
        await load();
      } catch (error) { setMessage(error instanceof Error ? error.message : "Could not share your location."); }
      finally { setBusy(false); }
    }, () => { setMessage("Location permission was not granted. Nothing was shared."); setBusy(false); }, { enableHighAccuracy: false, timeout: 15000 });
  };

  const stop = async () => {
    setBusy(true);
    try { const response = await fetch("/api/location", { method: "DELETE" }); if (!response.ok) throw new Error("Could not stop sharing."); setMessage("Location sharing stopped."); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not stop sharing."); }
    finally { setBusy(false); }
  };

  return (
    <div className="stack-lg">
      <section className="card stack-md">
        <h2>{data?.viewerShare ? "You are sharing" : "Share my current location"}</h2>
        <p className="meta">Kynfowk checks your location once, only after you ask. There is no background tracking, and the share expires automatically.</p>
        <div className="call-actions" role="group" aria-label="Sharing duration">
          {[1, 8, 24].map((hours) => <button key={hours} className={`button ${durationHours === hours ? "button-primary" : "button-secondary"}`} type="button" onClick={() => setDurationHours(hours)}>{hours === 24 ? "1 day" : `${hours} hour${hours > 1 ? "s" : ""}`}</button>)}
        </div>
        <div className="call-actions">
          <button className="button button-primary" type="button" disabled={busy} onClick={share}>{busy ? "Working…" : data?.viewerShare ? "Refresh my location" : "Share my location"}</button>
          {data?.viewerShare ? <button className="button button-secondary" type="button" disabled={busy} onClick={() => void stop()}>Stop sharing</button> : null}
        </div>
        {message ? <p className="meta" role="status">{message}</p> : null}
      </section>

      <section className="card stack-md">
        <h2>Family sharing now</h2>
        {!data ? <p className="meta">Gathering family locations…</p> : data.shares.length ? data.shares.map((share) => (
          <div className="notification-row" key={share.id}>
            <div>
              <strong>{share.isViewer ? "You" : share.displayName}</strong>
              <p className="meta">Updated {new Date(share.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · sharing until {new Date(share.sharedUntil).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
            </div>
            <a className="button button-secondary" href={`https://maps.google.com/?q=${share.latitude},${share.longitude}`} target="_blank" rel="noreferrer">Open map</a>
          </div>
        )) : <p className="empty-copy">No one is sharing right now. When immediate family opts in, their latest location will appear here.</p>}
      </section>
    </div>
  );
}
