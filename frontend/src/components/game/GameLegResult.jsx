export function GameLegResult({ legResult, onContinue }) {
  const game = legResult.updatedGame;
  const isMultiSetMatch = game?.sets_per_match > 1;
  const currentSetNumber = game?.current_set;
  const legsInSet = game?.legs?.filter(leg => leg.set_number === currentSetNumber && leg.finished_at) || [];

  function getLegWins(entityId, mode) {
    return legsInSet.filter(leg => mode === 'singles' ? leg.winner_id === entityId : leg.winner_team_id === entityId).length;
  }

  return (
    <div className="game-leg-result">
      <div className="game-leg-result__icon">🎯</div>
      <div>
        <h2 className="game-title game-leg-result__title">{legResult.winnerName}</h2>
        <p className="game-leg-result__subtitle">
          {legResult.setWon ? 'wins the set!' : 'wins the leg!'}
        </p>
      </div>

      <div className="card game-leg-result__card">
        {isMultiSetMatch && (
          <div className="game-leg-result__section game-leg-result__section--bordered">
            <div className="label-xs game-leg-result__label">Sets</div>
            <div className="game-leg-result__stats">
              {game.mode === 'singles'
                ? game.players?.map(player => (
                    <div key={player.id} className="game-leg-result__stat">
                      <div className="game-leg-result__name">{player.name}</div>
                      <div className="game-score-medium game-leg-result__value">{player.sets_won}</div>
                    </div>
                  ))
                : game.teams?.map(team => (
                    <div key={team.id} className="game-leg-result__stat">
                      <div className="game-leg-result__name">{team.name}</div>
                      <div className="game-score-medium game-leg-result__value">{team.sets_won}</div>
                    </div>
                  ))}
            </div>
          </div>
        )}

        <div className="game-leg-result__section">
          <div className="label-xs game-leg-result__label">Legs this set</div>
          <div className="game-leg-result__stats">
            {game.mode === 'singles'
              ? game.players?.map(player => (
                  <div key={player.id} className="game-leg-result__stat">
                    <div className="game-leg-result__name">{player.name}</div>
                    <div className="game-score-medium game-leg-result__value">
                      {getLegWins(player.id, 'singles')}
                    </div>
                  </div>
                ))
              : game.teams?.map(team => (
                  <div key={team.id} className="game-leg-result__stat">
                    <div className="game-leg-result__name">{team.name}</div>
                    <div className="game-score-medium game-leg-result__value">
                      {getLegWins(team.id, 'teams')}
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </div>

      <button className="btn-primary game-leg-result__button game-title-sm" onClick={onContinue}>
        {legResult.setWon ? `START SET ${game.current_set} →` : `START LEG ${game.current_leg} →`}
      </button>
    </div>
  );
}
