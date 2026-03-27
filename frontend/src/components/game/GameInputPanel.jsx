const MULTIPLIERS = [
  { value: 1, short: 'S' },
  { value: 2, short: 'D' },
  { value: 3, short: 'T' },
];

export function GameInputPanel({
  multiplier,
  setMultiplier,
  darts,
  remaining,
  error,
  submitting,
  onAddDart,
  onBust,
  onSubmit,
}) {
  return (
    <div className="game-input-panel">
      <div className="game-input-panel__row">
        {MULTIPLIERS.map(multiplierOption => (
          <button
            key={multiplierOption.value}
            className={`btn-multiplier ${multiplier === multiplierOption.value ? 'active' : ''}`}
            onClick={() => setMultiplier(multiplierOption.value)}
          >
            {multiplierOption.short}
          </button>
        ))}
      </div>

      <div className="game-input-grid">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(number => (
          <button
            key={number}
            className="btn-numpad"
            onClick={() => onAddDart(number, multiplier)}
            disabled={darts.length >= 3 || number * multiplier > remaining}
          >
            {number}
          </button>
        ))}
      </div>

      <div className="game-input-panel__bulls">
        <button className="btn-bull25" onClick={() => onAddDart(25, 1, true)} disabled={darts.length >= 3 || 25 > remaining}>Bull 25</button>
        <button className="btn-bull50" onClick={() => onAddDart(50, 1, true)} disabled={darts.length >= 3 || 50 > remaining}>Bull 50</button>
        <button className="btn-special" onClick={() => onAddDart(0, 1)} disabled={darts.length >= 3}>Miss</button>
      </div>

      {error && <p className="game-error-message">{error}</p>}

      <div className="game-input-panel__actions">
        {remaining <= 170 && (
          <button className="btn-bust" onClick={onBust} disabled={submitting}>BUST</button>
        )}
        <button className={`btn-submit ${darts.length > 0 ? 'ready' : 'waiting'}`} onClick={onSubmit} disabled={darts.length === 0 || submitting}>
          {submitting ? '...' : darts.length === 3 ? 'NEXT →' : `DONE (${darts.length}/3)`}
        </button>
      </div>
    </div>
  );
}
