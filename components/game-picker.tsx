import type { GameCatalogEntry } from "@/lib/data";

export function GamePicker({
  suggestions,
  participants,
  onSelect,
  onDismiss
}: {
  suggestions: GameCatalogEntry[];
  participants: Array<{ membershipId: string; displayName: string }>;
  onSelect: (game: GameCatalogEntry) => void;
  onDismiss: () => void;
}) {
  return (
    <div className="game-picker-shell">
      <div className="game-picker-header">
        <div>
          <p className="game-picker-eyebrow">Game time</p>
          <h3 className="game-picker-title">Pick a game for the call</h3>
          <p className="game-picker-sub">
            {participants.length} player{participants.length !== 1 ? "s" : ""} in the room
          </p>
        </div>
        <button className="game-picker-close" onClick={onDismiss} aria-label="Cancel">✕</button>
      </div>

      <div className="game-picker-list">
        {suggestions.map((game) => (
          <button
            key={game.id}
            className="game-card"
            onClick={() => onSelect(game)}
          >
            <div className="game-card-icon">
              {game.category === "trivia" ? "🎯" : game.category === "word" ? "📝" : "🎮"}
            </div>
            <div className="game-card-body">
              <p className="game-card-name">{game.name}</p>
              <p className="game-card-desc">{game.description}</p>
              <div className="game-card-meta">
                <span className="game-card-pill">{game.duration_label}</span>
                <span className="game-card-pill">{game.min_players}–{game.max_players} players</span>
                {game.matchScore > 0 && (
                  <span className="game-card-pill game-card-pill-match">✦ {game.matchReason}</span>
                )}
              </div>
            </div>
            <span className="game-card-arrow">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
