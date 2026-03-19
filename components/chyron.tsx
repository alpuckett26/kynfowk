const MESSAGES = [
  "🚧 Beta — thanks for being here early",
  "✦ New: in-call games are live — try trivia or word chain",
  "✦ New: family photo carousel on the home screen",
  "✦ New: family phonebook — phone numbers and addresses in one place",
  "✦ New: family polls — tell us sweet potato or pumpkin pie",
  "💬 Your feedback shapes every release — tap Share feedback on the dashboard",
  "📅 Invite your family circle and let Kynfowk find your next call window",
  "🔒 Private by design — your data never leaves your circle",
];

export function Chyron() {
  const text = MESSAGES.join("     ·     ");

  return (
    <div className="chyron" aria-label="Kynfowk announcements" role="marquee">
      <div className="chyron-track">
        <span className="chyron-text">{text}</span>
        <span className="chyron-text" aria-hidden>{text}</span>
      </div>
    </div>
  );
}
