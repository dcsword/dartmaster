function getDartClassName(dart) {
  if (!dart) return 'empty';
  if (dart.multiplier === 2) return 'double';
  if (dart.multiplier === 3) return 'triple';
  if (dart.isBull) return 'bull';
  return 'single';
}

export function GameDartSlots({ darts, onUndo }) {
  return (
    <div className="game-dart-slots">
      {[0, 1, 2].map(index => (
        <div key={index} className={`dart-slot ${darts[index] ? 'filled' : 'empty'} game-dart-slot`}>
          <div className="dart-slot-label">D{index + 1}</div>
          <div className={`dart-slot-value ${getDartClassName(darts[index])}`}>
            {darts[index] ? darts[index].display : '—'}
          </div>
        </div>
      ))}
      <button onClick={onUndo} disabled={darts.length === 0} className="game-undo-button">↩</button>
    </div>
  );
}
