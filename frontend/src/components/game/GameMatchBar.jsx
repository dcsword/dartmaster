export function GameMatchBar({ game, onQuit }) {
  return (
    <div className="game-match-bar">
      <div className="game-match-bar__meta">
        {game.sets_per_match > 1 && (
          <>
            <span className="game-meta-label">SET {game.current_set}/{game.sets_per_match}</span>
            <span className="game-meta-separator">·</span>
          </>
        )}
        <span className="game-meta-label">LEG {game.current_leg}/{game.legs_per_set}</span>
        <span className="game-meta-separator">·</span>
        <span className="game-meta-label">{game.ruleset.replace(/_/g, ' ').toUpperCase()}</span>
      </div>
      <button onClick={onQuit} className="game-quit-button">Quit</button>
    </div>
  );
}
