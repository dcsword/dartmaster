function buildScoreLabel(game, winnerId, winnerTeamId, field) {
  if (!game) return '';

  if (game.mode === 'singles') {
    const winner = game.players?.find(player => player.id === winnerId);
    const others = game.players?.filter(player => player.id !== winnerId);
    if (!winner) return '';
    return `${winner[field]} – ${others?.map(player => player[field]).join(' – ')}`;
  }

  const winner = game.teams?.find(team => team.id === winnerTeamId);
  const others = game.teams?.filter(team => team.id !== winnerTeamId);
  if (!winner) return '';
  return `${winner[field]} – ${others?.map(team => team[field]).join(' – ')}`;
}

export default function WinSummaryCards({ game, checkoutDart }) {
  const multiSet = game?.sets_per_match > 1;
  const legsLabel = buildScoreLabel(game, game?.winner_id, game?.winner_team_id, 'legs_won');
  const setsLabel = buildScoreLabel(game, game?.winner_id, game?.winner_team_id, 'sets_won');

  return (
    <div className="win-cards">
      {multiSet && (
        <div className="card-sm win-card">
          <div className="label-xs win-card-label">Sets</div>
          <div className="win-card-value">{setsLabel}</div>
        </div>
      )}

      <div className="card-sm win-card">
        <div className="label-xs win-card-label">Legs</div>
        <div className="win-card-value">{legsLabel}</div>
      </div>

      {checkoutDart && (
        <div className="card-sm win-card">
          <div className="label-xs win-card-label">Checkout</div>
          <div className="win-card-value win-card-value-success">{checkoutDart}</div>
        </div>
      )}

      <div className="card-sm win-card">
        <div className="label-xs win-card-label">Format</div>
        <div className="win-card-format">
          {game.format === 'best_of' ? 'Bo' : 'FT'}{game.legs_per_set}{game.sets_per_match > 1 ? ` · ${game.sets_per_match}S` : ''}
        </div>
      </div>
    </div>
  );
}
