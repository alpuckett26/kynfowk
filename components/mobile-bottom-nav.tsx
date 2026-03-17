import { getViewer } from "@/lib/data";

export async function MobileBottomNav() {
  const user = await getViewer();
  if (!user) return null;

  return (
    <nav className="mobile-bottom-nav" aria-label="Main navigation">
      <a className="mobile-nav-item" href="/dashboard">
        <span className="mobile-nav-icon">⊞</span>
        <span>Dashboard</span>
      </a>
      <a className="mobile-nav-item" href="/family">
        <span className="mobile-nav-icon">◎</span>
        <span>Family</span>
      </a>
      <a className="mobile-nav-item" href="/notifications">
        <span className="mobile-nav-icon">◉</span>
        <span>Updates</span>
      </a>
      <a className="mobile-nav-item" href="/settings">
        <span className="mobile-nav-icon">✱</span>
        <span>Settings</span>
      </a>
    </nav>
  );
}
